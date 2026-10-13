import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AI_MODEL, getAnthropic } from './client';
import { MAP_COLUMNS_SYSTEM } from './prompts';
import { ColumnMappingSchema } from './schemas';
import { heuristicMapping, missingRequired, sanitizeMapping } from '@/lib/parsing/heuristics';
import type { ColumnMappingResult, MappingIssue } from '@/lib/types';

export interface MapColumnsInput {
  headers: string[];
  sampleRows: Record<string, string>[];
}

export interface MapColumnsOutput extends ColumnMappingResult {
  dateFormat: 'day_first' | 'month_first' | 'iso' | 'unknown';
  /** set when Claude was attempted but failed; the result is then heuristic */
  aiError?: string;
}

/**
 * Ask Claude to map the file's columns. Falls back to the name-based
 * heuristic when the API key is missing or the call fails, so uploads never
 * block on the AI. Claude's answer is sanitised against the real header list
 * (a hallucinated header can never reach the importer).
 */
export async function mapColumns(input: MapColumnsInput): Promise<MapColumnsOutput> {
  const headers = input.headers.filter(Boolean).slice(0, 60);
  const fallback = heuristicMapping(headers);
  const client = getAnthropic();
  if (!client) return { ...fallback, dateFormat: 'unknown' };

  try {
    const response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 2048,
      output_config: { effort: 'low', format: zodOutputFormat(ColumnMappingSchema) },
      system: [{ type: 'text', text: MAP_COLUMNS_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: [
            'Headers (copy values exactly from this list):',
            JSON.stringify(headers),
            '',
            `First ${input.sampleRows.length} rows:`,
            JSON.stringify(input.sampleRows.slice(0, 20)),
            '',
            'A name-based guess you may correct:',
            JSON.stringify(fallback.mapping),
          ].join('\n'),
        },
      ],
    });

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return { ...fallback, dateFormat: 'unknown', aiError: 'The AI did not return a mapping.' };
    }

    const out = response.parsed_output;
    const mapping = sanitizeMapping(out.mapping, headers);
    const issues: MappingIssue[] = out.issues.map((i) => ({ field: i.field ?? undefined, message: i.message, severity: i.severity }));

    // If Claude dropped a required field the heuristic found, keep the heuristic's choice
    // (still shown to the owner for confirmation).
    for (const f of missingRequired(mapping)) {
      const h = fallback.mapping[f];
      if (h && !Object.values(mapping).includes(h)) {
        mapping[f] = h;
        issues.push({ field: f, message: `Used "${h}" for ${f} by name; please confirm.`, severity: 'warning' });
      }
    }
    for (const f of missingRequired(mapping)) {
      if (!issues.some((i) => i.field === f && i.severity === 'error')) {
        issues.push({ field: f, message: `No column found for ${f}.`, severity: 'error' });
      }
    }

    return {
      mapping,
      confidence: Math.max(0, Math.min(1, out.confidence)),
      issues,
      source: 'claude',
      dateFormat: out.date_format,
    };
  } catch (error) {
    const { describeAiError } = await import('./client');
    return { ...fallback, dateFormat: 'unknown', aiError: describeAiError(error) };
  }
}
