import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AI_MODEL, describeAiError, getAnthropic } from './client';
import { EXPLAIN_SYSTEM, WEEKLY_SUMMARY_SYSTEM, WHATSAPP_SYSTEM } from './prompts';
import { ExplainSchema, WeeklySummarySchema, WhatsAppMessageSchema, type ExplainOutput, type WeeklySummaryOutput, type WhatsAppMessageOutput } from './schemas';
import type { Recommendation, RecommendationSummary } from '@/lib/calculations/reorder';

/** The subset of a recommendation Claude is shown. Numbers are final. */
export function toExplainRow(r: Recommendation) {
  return {
    product_id: r.productId,
    product: r.name,
    status: r.status,
    current_stock: r.currentStock,
    sells_per_day: r.dailyVelocity,
    days_of_stock_left: Number.isFinite(r.daysOfCover) ? r.daysOfCover : 'no recent sales',
    reorder_point: r.reorderPoint,
    recommended_order_quantity: r.recommendedQuantity,
    supplier_id: r.supplierId,
    supplier: r.supplierName ?? 'Other items',
    delivery_days: r.leadTimeDays,
    target_days_of_stock: r.targetCoverDays,
    last_sale: r.lastSaleDate,
  };
}

export interface ExplainInput {
  storeName: string;
  currency: string;
  asOf: string;
  recommendations: Recommendation[];
}

export async function explainRecommendations(input: ExplainInput): Promise<{ result: ExplainOutput | null; error?: string }> {
  const client = getAnthropic();
  if (!client) return { result: null, error: 'AI is not configured.' };

  const toOrder = input.recommendations.filter((r) => r.recommendedQuantity > 0).slice(0, 60);
  const hold = input.recommendations.filter((r) => r.status === 'overstocked' || r.status === 'dead_stock').slice(0, 30);

  try {
    const response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium', format: zodOutputFormat(ExplainSchema) },
      system: [{ type: 'text', text: EXPLAIN_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            store_name: input.storeName,
            currency: input.currency,
            sales_data_up_to: input.asOf,
            items_to_order: toOrder.map(toExplainRow),
            items_to_hold: hold.map(toExplainRow),
          }),
        },
      ],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) return { result: null, error: 'The AI did not return an explanation.' };

    // Guard rail: drop any product id Claude invented.
    const known = new Set(input.recommendations.map((r) => r.productId));
    const out = response.parsed_output;
    out.reorder = out.reorder.filter((r) => known.has(r.product_id));
    out.do_not_order = out.do_not_order.filter((r) => known.has(r.product_id));
    return { result: out };
  } catch (error) {
    return { result: null, error: describeAiError(error) };
  }
}

export interface WhatsAppInput {
  storeName: string;
  supplierName: string;
  notes?: string | null;
  lines: { product: string; quantity: number; unit?: string }[];
}

export async function whatsappMessage(input: WhatsAppInput): Promise<{ result: WhatsAppMessageOutput | null; error?: string }> {
  const client = getAnthropic();
  if (!client) return { result: null, error: 'AI is not configured.' };
  try {
    const response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 4096,
      output_config: { effort: 'low', format: zodOutputFormat(WhatsAppMessageSchema) },
      system: [{ type: 'text', text: WHATSAPP_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) return { result: null, error: 'The AI did not return a message.' };
    return { result: response.parsed_output };
  } catch (error) {
    return { result: null, error: describeAiError(error) };
  }
}

export interface WeeklySummaryInput {
  storeName: string;
  currency: string;
  summary: RecommendationSummary;
  recommendations: Recommendation[];
}

export async function weeklySummary(input: WeeklySummaryInput): Promise<{ result: WeeklySummaryOutput | null; error?: string }> {
  const client = getAnthropic();
  if (!client) return { result: null, error: 'AI is not configured.' };
  const top = (pred: (r: Recommendation) => boolean, n: number) => input.recommendations.filter(pred).slice(0, n).map(toExplainRow);
  try {
    const response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 8192,
      output_config: { effort: 'medium', format: zodOutputFormat(WeeklySummarySchema) },
      system: [{ type: 'text', text: WEEKLY_SUMMARY_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            store_name: input.storeName,
            currency: input.currency,
            totals: input.summary,
            top_reorder: top((r) => r.flags.reorderNow, 8),
            top_stockout_risk: top((r) => r.flags.stockoutRisk, 5),
            top_overstocked: top((r) => r.flags.overstocked, 5),
            dead_stock: top((r) => r.flags.deadStock, 8),
            fastest_sellers: [...input.recommendations].sort((a, b) => b.dailyVelocity - a.dailyVelocity).slice(0, 5).map(toExplainRow),
          }),
        },
      ],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) return { result: null, error: 'The AI did not return a summary.' };
    return { result: response.parsed_output };
  } catch (error) {
    return { result: null, error: describeAiError(error) };
  }
}
