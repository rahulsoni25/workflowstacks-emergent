import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { calculateRecommendations, type ProductInput, type RecommendationResult } from '@/lib/calculations/reorder';
import type { ProductRow, PurchaseOrderWithItems, StoreRow, SupplierRow } from '@/lib/types';

/** Sales lookback: 30 days for dead stock + a buffer for late-dated exports. */
const SALES_LOOKBACK_DAYS = 45;

export async function loadSuppliers(storeId: string): Promise<SupplierRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('suppliers').select('*').eq('store_id', storeId).order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadProducts(storeId: string): Promise<ProductRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId).order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Everything the deterministic calculation needs, in two queries.
 */
export async function loadRecommendationInputs(storeId: string): Promise<{ products: ProductInput[]; suppliers: SupplierRow[] }> {
  const supabase = createClient();
  const [products, suppliers, salesRes] = await Promise.all([
    loadProducts(storeId),
    loadSuppliers(storeId),
    supabase.rpc('sales_window', { p_store_id: storeId, p_days: SALES_LOOKBACK_DAYS }),
  ]);
  if (salesRes.error) throw new Error(salesRes.error.message);

  const salesByProduct = new Map<string, { saleDate: string; quantitySold: number }[]>();
  for (const s of salesRes.data ?? []) {
    const list = salesByProduct.get(s.product_id) ?? [];
    list.push({ saleDate: s.sale_date, quantitySold: Number(s.quantity_sold) });
    salesByProduct.set(s.product_id, list);
  }
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const inputs: ProductInput[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    supplierId: p.supplier_id,
    supplierName: p.supplier_id ? supplierById.get(p.supplier_id)?.name ?? null : null,
    unitCost: p.unit_cost == null ? null : Number(p.unit_cost),
    currentStock: Number(p.current_stock),
    leadTimeDays: p.lead_time_days,
    targetCoverDays: p.target_cover_days,
    safetyStock: p.safety_stock,
    sales: salesByProduct.get(p.id) ?? [],
  }));
  return { products: inputs, suppliers };
}

export async function getRecommendations(storeId: string): Promise<RecommendationResult & { suppliers: SupplierRow[]; hasSales: boolean }> {
  const { products, suppliers } = await loadRecommendationInputs(storeId);
  const hasSales = products.some((p) => p.sales.length > 0);
  const result = calculateRecommendations(products);
  return { ...result, suppliers, hasSales };
}

export async function lastUpload(storeId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('uploads')
    .select('id, file_name, status, row_count, created_at')
    .eq('store_id', storeId)
    .eq('status', 'processed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function listPurchaseOrders(storeId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(*), items:purchase_order_items(id)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ items, supplier, ...po }) => ({
    ...po,
    supplier: supplier ?? null,
    itemCount: Array.isArray(items) ? items.length : 0,
  }));
}

export async function getPurchaseOrder(storeId: string, id: string): Promise<PurchaseOrderWithItems | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(*), items:purchase_order_items(*, product:products(id, name, sku, current_stock))')
    .eq('store_id', storeId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { items: rawItems, supplier, ...po } = data;
  const items = (rawItems ?? []).slice().sort((a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? ''));
  return { ...po, supplier: supplier ?? null, items };
}

export function storeDefaults(store: StoreRow) {
  return { leadTimeDays: store.default_lead_time_days, targetCoverDays: store.default_target_cover_days };
}
