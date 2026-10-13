import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AI_MODEL, getAnthropic } from './client';
import { CLEAN_PRODUCTS_SYSTEM } from './prompts';
import { CleanProductsSchema } from './schemas';

export interface CleanProductInput {
  name: string;
  sku?: string | null;
  category?: string | null;
}

export interface CleanProductResult {
  cleanName: string;
  duplicateOf: number | null;
  category: string | null;
}

const BATCH = 80;

/**
 * Tidy product names and flag duplicates. Returns one result per input, in
 * order. When the AI is unavailable the original names are returned unchanged
 * so the import still completes.
 */
export async function cleanProducts(products: CleanProductInput[]): Promise<{ results: CleanProductResult[]; aiError?: string }> {
  const identity: CleanProductResult[] = products.map((p) => ({ cleanName: p.name, duplicateOf: null, category: p.category ?? null }));
  const client = getAnthropic();
  if (!client || products.length === 0) return { results: identity };

  const results = [...identity];
  try {
    for (let start = 0; start < products.length; start += BATCH) {
      const slice = products.slice(start, start + BATCH);
      const response = await client.messages.parse({
        model: AI_MODEL,
        max_tokens: 8192,
        output_config: { effort: 'low', format: zodOutputFormat(CleanProductsSchema) },
        system: [{ type: 'text', text: CLEAN_PRODUCTS_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: JSON.stringify(slice.map((p, i) => ({ index: i, name: p.name, sku: p.sku ?? null, category: p.category ?? null }))),
          },
        ],
      });
      if (response.stop_reason === 'refusal' || !response.parsed_output) continue;
      for (const r of response.parsed_output.products) {
        if (r.index < 0 || r.index >= slice.length) continue;
        const cleanName = r.clean_name.trim() || slice[r.index].name;
        const dup = r.duplicate_of != null && r.duplicate_of >= 0 && r.duplicate_of < slice.length && r.duplicate_of !== r.index ? start + r.duplicate_of : null;
        results[start + r.index] = { cleanName, duplicateOf: dup, category: r.category?.trim() || slice[r.index].category || null };
      }
    }
    return { results };
  } catch (error) {
    const { describeAiError } = await import('./client');
    return { results: identity, aiError: describeAiError(error) };
  }
}
