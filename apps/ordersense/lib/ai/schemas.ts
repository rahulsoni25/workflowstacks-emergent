// The Anthropic SDK's zodOutputFormat() is typed against zod/v4, which zod 3.25+ ships.
import * as z from 'zod/v4';
import { STANDARD_FIELDS } from '@/lib/types';

/**
 * Zod schemas for every Claude response. They are passed to
 * `zodOutputFormat()` so the API constrains the output to this shape, and
 * re-validated on the way in. Claude never returns a quantity: every number
 * a user sees comes from lib/calculations/reorder.ts.
 */

const nullableHeader = z.string().nullable().describe('Exact source column header, or null when the file has no such column');

export const ColumnMappingSchema = z.object({
  mapping: z.object(Object.fromEntries(STANDARD_FIELDS.map((f) => [f, nullableHeader])) as Record<(typeof STANDARD_FIELDS)[number], typeof nullableHeader>),
  confidence: z.number().min(0).max(1).describe('0-1: how sure you are about the required fields'),
  issues: z
    .array(
      z.object({
        field: z.enum(STANDARD_FIELDS).nullable(),
        message: z.string(),
        severity: z.enum(['error', 'warning', 'info']),
      }),
    )
    .describe('Problems a store owner should know about, in plain words'),
  date_format: z.enum(['day_first', 'month_first', 'iso', 'unknown']).describe('How dates in the sample are written'),
});
export type ColumnMappingOutput = z.infer<typeof ColumnMappingSchema>;

export const CleanProductsSchema = z.object({
  products: z.array(
    z.object({
      index: z.number().int().describe('Index of the product in the input list'),
      clean_name: z.string().describe('Tidy display name: fix casing, remove codes/noise, keep size and brand'),
      duplicate_of: z.number().int().nullable().describe('Index of another input product this is the same item as, else null'),
      category: z.string().nullable().describe('Short grocery category like Dairy, Bakery, Beverages, Household; null if unclear'),
    }),
  ),
});
export type CleanProductsOutput = z.infer<typeof CleanProductsSchema>;

const bilingual = z.object({ en: z.string(), ar: z.string() });

export const ExplainSchema = z.object({
  summary: bilingual.describe('Two or three sentences: the overall situation today'),
  reorder: z
    .array(
      z.object({
        product_id: z.string(),
        why: bilingual.describe('One sentence: why this item needs ordering, quoting the given numbers'),
        if_not: bilingual.describe('One sentence: what likely happens if they do not order'),
      }),
    )
    .describe('Only products the input marks as needing an order'),
  do_not_order: z
    .array(
      z.object({
        product_id: z.string(),
        why: bilingual.describe('One sentence: why to hold off'),
      }),
    )
    .describe('Only products the input marks as overstocked or dead stock'),
  supplier_messages: z
    .array(
      z.object({
        supplier_id: z.string().nullable(),
        supplier_name: z.string(),
        message: bilingual.describe('WhatsApp-ready order message listing each item with the exact given quantity'),
      }),
    )
    .describe('One message per supplier in the input'),
});
export type ExplainOutput = z.infer<typeof ExplainSchema>;

export const WhatsAppMessageSchema = z.object({
  message: bilingual.describe('A short, polite WhatsApp order message listing every line with its exact quantity'),
});
export type WhatsAppMessageOutput = z.infer<typeof WhatsAppMessageSchema>;

export const WeeklySummarySchema = z.object({
  headline: bilingual.describe('One line: the single most important thing to do this week'),
  insights: z.array(bilingual).min(3).max(6).describe('Short bullet points grounded in the given numbers'),
  actions: z.array(bilingual).min(1).max(5).describe('Concrete next steps for the owner'),
});
export type WeeklySummaryOutput = z.infer<typeof WeeklySummarySchema>;
