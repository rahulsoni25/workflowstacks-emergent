import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { normalizeRows, type NormalizeIssue } from '@/lib/parsing/normalize';
import { cleanProducts } from '@/lib/ai/clean-products';
import type { ColumnMapping, StoreRow } from '@/lib/types';
import type { Database, Json } from '@/lib/db/types';

export interface ImportOptions {
  store: StoreRow;
  uploadId: string | null;
  mapping: ColumnMapping;
  rows: Record<string, unknown>[];
  reportDate: string;
  dayFirst: boolean;
  /** Ask Claude to tidy names and merge duplicates (capped for speed). */
  cleanNames: boolean;
}

export interface ImportResult {
  products: number;
  newProducts: number;
  salesRows: number;
  suppliers: number;
  issues: NormalizeIssue[];
  dateRange: { from: string; to: string } | null;
  aiError?: string;
  mergedDuplicates: number;
}

const CHUNK = 500;
const CLEAN_CAP = 160; // two AI batches; keeps the request inside a Vercel function budget

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Normalise mapped rows and write suppliers, products and sales. Re-uploads
 * are idempotent: products match on normalised name, sales on product+day.
 * Owner-tuned product settings (lead time, cover, safety stock) are kept.
 */
export async function importRows(opts: ImportOptions): Promise<ImportResult> {
  const supabase = createClient();
  const storeId = opts.store.id;

  const norm = normalizeRows(opts.rows, opts.mapping, { reportDate: opts.reportDate, dayFirst: opts.dayFirst });

  // ---- AI name cleaning + duplicate merge (optional, capped) ----
  let aiError: string | undefined;
  let mergedDuplicates = 0;
  const canonicalOf = new Map<string, string>(); // raw normalized -> canonical normalized
  const displayName = new Map<string, string>();
  const categoryOf = new Map<string, string | null>();
  if (opts.cleanNames && norm.products.length > 0) {
    const subset = norm.products.slice(0, CLEAN_CAP);
    const { results, aiError: err } = await cleanProducts(subset.map((p) => ({ name: p.name, sku: p.sku, category: p.category })));
    aiError = err;
    results.forEach((r, i) => {
      const p = subset[i];
      displayName.set(p.normalizedName, r.cleanName);
      categoryOf.set(p.normalizedName, r.category);
      if (r.duplicateOf != null && r.duplicateOf !== i) {
        const canonical = subset[r.duplicateOf];
        if (canonical) {
          canonicalOf.set(p.normalizedName, canonical.normalizedName);
          mergedDuplicates++;
        }
      }
    });
  }
  const resolve = (n: string): string => {
    let cur = n;
    for (let i = 0; i < 5 && canonicalOf.has(cur); i++) cur = canonicalOf.get(cur)!;
    return cur;
  };

  // Merge duplicate products into their canonical entry.
  const productsByKey = new Map<string, (typeof norm.products)[number]>();
  for (const p of norm.products) {
    const key = resolve(p.normalizedName);
    const existing = productsByKey.get(key);
    if (!existing) {
      productsByKey.set(key, { ...p, normalizedName: key });
    } else {
      existing.sku = existing.sku ?? p.sku;
      existing.barcode = existing.barcode ?? p.barcode;
      existing.category = existing.category ?? p.category;
      existing.supplierName = existing.supplierName ?? p.supplierName;
      existing.unitCost = existing.unitCost ?? p.unitCost;
      if (p.currentStock != null && (existing.currentStock == null || p.stockAsOf >= existing.stockAsOf)) {
        existing.currentStock = p.currentStock;
        existing.stockAsOf = p.stockAsOf;
      }
    }
  }
  const salesByKey = new Map<string, { normalizedName: string; saleDate: string; quantitySold: number; revenue: number | null }>();
  for (const s of norm.sales) {
    const key = resolve(s.normalizedName);
    const k = `${key}|${s.saleDate}`;
    const existing = salesByKey.get(k);
    if (existing) {
      existing.quantitySold += s.quantitySold;
      if (s.revenue != null) existing.revenue = (existing.revenue ?? 0) + s.revenue;
    } else salesByKey.set(k, { ...s, normalizedName: key });
  }

  // ---- Suppliers ----
  const supplierNames = [...new Set([...productsByKey.values()].map((p) => p.supplierName).filter((n): n is string => Boolean(n)))];
  const supplierIdByName = new Map<string, string>();
  if (supplierNames.length) {
    const { error } = await supabase
      .from('suppliers')
      .upsert(
        supplierNames.map((name) => ({ store_id: storeId, name, default_lead_time_days: opts.store.default_lead_time_days })),
        { onConflict: 'store_id,name', ignoreDuplicates: true },
      );
    if (error) throw new Error(`Suppliers: ${error.message}`);
  }
  const { data: suppliers, error: supErr } = await supabase.from('suppliers').select('id, name').eq('store_id', storeId);
  if (supErr) throw new Error(`Suppliers: ${supErr.message}`);
  for (const s of suppliers ?? []) supplierIdByName.set(s.name, s.id);

  // ---- Products: split into inserts (store defaults) and updates (keep settings) ----
  const { data: existingRows, error: exErr } = await supabase.from('products').select('id, normalized_name').eq('store_id', storeId);
  if (exErr) throw new Error(`Products: ${exErr.message}`);
  const existingId = new Map((existingRows ?? []).map((r) => [r.normalized_name, r.id]));

  type ProductInsert = Database['public']['Tables']['products']['Insert'];
  const inserts: ProductInsert[] = [];
  const updates: ProductInsert[] = [];
  for (const p of productsByKey.values()) {
    const base = {
      store_id: storeId,
      normalized_name: p.normalizedName,
      name: displayName.get(p.normalizedName) ?? p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category ?? categoryOf.get(p.normalizedName) ?? null,
      supplier_id: p.supplierName ? supplierIdByName.get(p.supplierName) ?? null : null,
      unit_cost: p.unitCost,
      current_stock: p.currentStock ?? 0,
      stock_updated_at: p.stockAsOf,
    };
    if (existingId.has(p.normalizedName)) updates.push(base);
    else inserts.push({ ...base, lead_time_days: opts.store.default_lead_time_days, target_cover_days: opts.store.default_target_cover_days, safety_stock: 0 });
  }
  for (const batch of chunks(inserts, CHUNK)) {
    const { error } = await supabase.from('products').insert(batch);
    if (error) throw new Error(`Products: ${error.message}`);
  }
  for (const batch of chunks(updates, CHUNK)) {
    const { error } = await supabase.from('products').upsert(batch, { onConflict: 'store_id,normalized_name' });
    if (error) throw new Error(`Products: ${error.message}`);
  }

  const { data: allProducts, error: allErr } = await supabase.from('products').select('id, normalized_name').eq('store_id', storeId);
  if (allErr) throw new Error(`Products: ${allErr.message}`);
  const idByKey = new Map((allProducts ?? []).map((r) => [r.normalized_name, r.id]));

  // ---- Sales ----
  const saleRows = [...salesByKey.values()]
    .map((s) => {
      const product_id = idByKey.get(s.normalizedName);
      if (!product_id) return null;
      return { store_id: storeId, product_id, sale_date: s.saleDate, quantity_sold: s.quantitySold, revenue: s.revenue };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
  for (const batch of chunks(saleRows, CHUNK)) {
    const { error } = await supabase.from('sales').upsert(batch, { onConflict: 'product_id,sale_date' });
    if (error) throw new Error(`Sales: ${error.message}`);
  }

  // ---- Upload bookkeeping ----
  if (opts.uploadId) {
    await supabase
      .from('uploads')
      .update({
        status: 'processed',
        row_count: norm.rowsRead,
        column_mapping: opts.mapping,
        error_summary: { issues: norm.issues as unknown as Json, aiError: aiError ?? null, mergedDuplicates },
      })
      .eq('id', opts.uploadId);
  }

  return {
    products: productsByKey.size,
    newProducts: inserts.length,
    salesRows: saleRows.length,
    suppliers: supplierNames.length,
    issues: norm.issues,
    dateRange: norm.dateRange,
    aiError,
    mergedDuplicates,
  };
}
