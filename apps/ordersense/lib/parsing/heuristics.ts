import { STANDARD_FIELDS, type ColumnMapping, type ColumnMappingResult, type MappingIssue, type StandardField, REQUIRED_FIELDS } from '@/lib/types';

/**
 * Name-based column matching. Used (a) as the fallback when Claude is not
 * configured or fails, and (b) to seed the prompt. English and Arabic
 * synonyms from common POS exports in the Gulf region.
 */
const SYNONYMS: Record<StandardField, string[]> = {
  item_name: ['item name', 'item', 'product name', 'product', 'description', 'name', 'item description', 'article', 'goods', 'الصنف', 'اسم الصنف', 'المنتج', 'اسم المنتج', 'البيان', 'الوصف'],
  sku: ['sku', 'item code', 'code', 'product code', 'item no', 'item number', 'article no', 'plu', 'id', 'item id', 'product id', 'رمز', 'كود', 'رمز الصنف', 'رقم الصنف'],
  barcode: ['barcode', 'bar code', 'ean', 'upc', 'gtin', 'باركود', 'الباركود'],
  sale_date: ['date', 'sale date', 'sales date', 'transaction date', 'trans date', 'day', 'invoice date', 'bill date', 'التاريخ', 'تاريخ', 'تاريخ البيع'],
  quantity_sold: ['qty sold', 'quantity sold', 'sold qty', 'sold', 'sales qty', 'quantity', 'qty', 'units sold', 'sales quantity', 'sold quantity', 'الكمية المباعة', 'الكمية', 'المباع', 'كمية البيع'],
  current_stock: ['stock on hand', 'current stock', 'stock', 'on hand', 'soh', 'qty on hand', 'quantity on hand', 'closing stock', 'stock qty', 'balance', 'inventory', 'available', 'available qty', 'المخزون', 'الرصيد', 'المخزون الحالي', 'الكمية المتاحة', 'رصيد المخزون'],
  unit_cost: ['cost', 'unit cost', 'cost price', 'purchase price', 'buy price', 'cp', 'cost per unit', 'avg cost', 'average cost', 'التكلفة', 'سعر التكلفة', 'سعر الشراء'],
  supplier: ['supplier', 'vendor', 'supplier name', 'vendor name', 'distributor', 'المورد', 'المورّد', 'اسم المورد'],
  category: ['category', 'department', 'group', 'product group', 'class', 'الفئة', 'القسم', 'المجموعة'],
  revenue: ['revenue', 'sales', 'sales amount', 'amount', 'total', 'net sales', 'sales value', 'total sales', 'المبيعات', 'الإيراد', 'قيمة المبيعات', 'المبلغ'],
};

// Fields that commonly share words: resolve in this order so "qty sold" is
// taken by quantity_sold before "sold" could be read as revenue, etc.
const RESOLUTION_ORDER: StandardField[] = [
  'barcode',
  'sku',
  'sale_date',
  'quantity_sold',
  'current_stock',
  'unit_cost',
  'supplier',
  'category',
  'revenue',
  'item_name',
];

export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[_\-./()\[\]#:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreHeader(header: string, field: StandardField): number {
  const h = normalizeHeader(header);
  if (!h) return 0;
  let best = 0;
  for (const syn of SYNONYMS[field]) {
    const s = normalizeHeader(syn);
    if (h === s) return 1;
    if (h.startsWith(s + ' ') || h.endsWith(' ' + s)) best = Math.max(best, 0.8);
    else if (h.includes(s)) best = Math.max(best, s.length >= 4 ? 0.6 : 0.3);
  }
  return best;
}

export function emptyMapping(): ColumnMapping {
  return Object.fromEntries(STANDARD_FIELDS.map((f) => [f, null])) as ColumnMapping;
}

export function heuristicMapping(headers: string[]): ColumnMappingResult {
  const mapping = emptyMapping();
  const used = new Set<string>();
  const scores: number[] = [];

  for (const field of RESOLUTION_ORDER) {
    let bestHeader: string | null = null;
    let bestScore = 0;
    for (const h of headers) {
      if (used.has(h)) continue;
      const s = scoreHeader(h, field);
      if (s > bestScore) {
        bestScore = s;
        bestHeader = h;
      }
    }
    if (bestHeader && bestScore >= 0.6) {
      mapping[field] = bestHeader;
      used.add(bestHeader);
      scores.push(bestScore);
    }
  }

  const issues: MappingIssue[] = [];
  for (const f of REQUIRED_FIELDS) {
    if (!mapping[f]) issues.push({ field: f, message: `No column found for ${f}.`, severity: 'error' });
  }
  if (!mapping.sale_date) issues.push({ field: 'sale_date', message: 'No date column: the report date will be asked for.', severity: 'warning' });

  const requiredFound = REQUIRED_FIELDS.filter((f) => mapping[f]).length;
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const confidence = Math.round(((requiredFound / REQUIRED_FIELDS.length) * 0.7 + avg * 0.3) * 100) / 100;

  return { mapping, confidence, issues, source: 'heuristic' };
}

/** Keep only mapping values that are real headers; drop duplicates. */
export function sanitizeMapping(candidate: Partial<Record<string, unknown>>, headers: string[]): ColumnMapping {
  const mapping = emptyMapping();
  const headerSet = new Set(headers);
  const used = new Set<string>();
  for (const field of STANDARD_FIELDS) {
    const v = candidate[field];
    if (typeof v !== 'string' || !v) continue;
    // Accept exact header or a case/whitespace-insensitive match.
    const exact = headerSet.has(v) ? v : headers.find((h) => normalizeHeader(h) === normalizeHeader(v));
    if (!exact || used.has(exact)) continue;
    mapping[field] = exact;
    used.add(exact);
  }
  return mapping;
}

export function missingRequired(mapping: ColumnMapping): StandardField[] {
  return REQUIRED_FIELDS.filter((f) => !mapping[f]);
}
