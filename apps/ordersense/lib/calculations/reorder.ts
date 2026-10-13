/**
 * OrderSense AI - core reorder calculations.
 *
 * Everything in this module is deterministic, pure TypeScript. Claude never
 * touches these numbers; it only explains or formats them afterwards.
 *
 * Definitions (from the product spec):
 *   daily_velocity             = sum(quantity_sold over last 14 days) / 14
 *   days_of_cover              = current_stock / daily_velocity
 *   reorder_point              = (daily_velocity * lead_time_days) + safety_stock
 *   recommended_order_quantity = max(0, (daily_velocity * target_cover_days) - current_stock)
 *
 * Status rules:
 *   "dead_stock"    no sales in the last 30 days
 *   "stockout_risk" current_stock will finish before the supplier lead time
 *   "reorder_now"   current_stock <= reorder_point
 *   "order_soon"    days_of_cover < target_cover_days
 *   "healthy"       target_cover_days <= days_of_cover <= target_cover_days + 5
 *   "overstocked"   days_of_cover > target_cover_days + 5
 *
 * Several rules can be true at once (a stockout risk is always also at or
 * below the reorder point), so each product gets ONE primary `status` chosen
 * by the precedence above, plus independent boolean flags so the dashboard can
 * count every risk category.
 */

export const VELOCITY_WINDOW_DAYS = 14;
export const DEAD_STOCK_WINDOW_DAYS = 30;
export const HEALTHY_BAND_DAYS = 5;

export type ProductStatus =
  | 'dead_stock'
  | 'stockout_risk'
  | 'reorder_now'
  | 'order_soon'
  | 'healthy'
  | 'overstocked';

export interface SaleRecord {
  /** ISO date (YYYY-MM-DD) */
  saleDate: string;
  quantitySold: number;
}

export interface ProductInput {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  unitCost?: number | null;
  currentStock: number;
  leadTimeDays: number;
  targetCoverDays: number;
  safetyStock: number;
  sales: SaleRecord[];
}

export interface Recommendation {
  productId: string;
  name: string;
  sku: string | null;
  category: string | null;
  supplierId: string | null;
  supplierName: string | null;
  unitCost: number | null;
  currentStock: number;
  leadTimeDays: number;
  targetCoverDays: number;
  safetyStock: number;

  /** units sold in the last 14 days */
  sold14d: number;
  /** units sold in the last 30 days */
  sold30d: number;
  /** average units per day over the 14-day window */
  dailyVelocity: number;
  /** days until stock runs out at current velocity; Infinity when velocity is 0 */
  daysOfCover: number;
  reorderPoint: number;
  recommendedQuantity: number;
  /** recommendedQuantity * unitCost, or null when cost is unknown */
  estimatedCost: number | null;

  status: ProductStatus;
  flags: {
    deadStock: boolean;
    stockoutRisk: boolean;
    reorderNow: boolean;
    orderSoon: boolean;
    overstocked: boolean;
  };
  /** last date on which this product sold, or null */
  lastSaleDate: string | null;
}

export interface CalculationOptions {
  /**
   * The date the stock figure is "as of". Velocity windows count back from
   * here. Defaults to the latest sale date across all products so an export
   * uploaded a few days late still gives sensible numbers.
   */
  asOf?: string;
  /** Round recommended quantities up to whole units (default true). */
  wholeUnits?: boolean;
}

/** Parse YYYY-MM-DD into a UTC day number (days since epoch). */
export function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return Number.NaN;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round(n: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function safeNumber(n: unknown, fallback = 0): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/** Latest sale date in the data set, or today when there are no sales. */
export function latestSaleDate(products: Pick<ProductInput, 'sales'>[]): string {
  let latest = Number.NEGATIVE_INFINITY;
  let latestIso: string | null = null;
  for (const p of products) {
    for (const s of p.sales) {
      const d = dayNumber(s.saleDate);
      if (Number.isFinite(d) && d > latest) {
        latest = d;
        latestIso = s.saleDate.slice(0, 10);
      }
    }
  }
  return latestIso ?? toIsoDate(new Date());
}

/** Sum of quantity sold within (asOf - windowDays, asOf]. */
export function sumSalesInWindow(sales: SaleRecord[], asOf: string, windowDays: number): number {
  const end = dayNumber(asOf);
  const start = end - windowDays; // exclusive
  let total = 0;
  for (const s of sales) {
    const d = dayNumber(s.saleDate);
    if (!Number.isFinite(d)) continue;
    if (d > start && d <= end) total += Math.max(0, safeNumber(s.quantitySold));
  }
  return total;
}

export function dailyVelocity(sales: SaleRecord[], asOf: string): number {
  return sumSalesInWindow(sales, asOf, VELOCITY_WINDOW_DAYS) / VELOCITY_WINDOW_DAYS;
}

export function daysOfCover(currentStock: number, velocity: number): number {
  if (velocity <= 0) return currentStock > 0 ? Number.POSITIVE_INFINITY : 0;
  return Math.max(0, currentStock) / velocity;
}

export function reorderPoint(velocity: number, leadTimeDays: number, safetyStock: number): number {
  return velocity * Math.max(0, leadTimeDays) + Math.max(0, safetyStock);
}

export function recommendedOrderQuantity(
  velocity: number,
  targetCoverDays: number,
  currentStock: number,
  wholeUnits = true,
): number {
  const raw = Math.max(0, velocity * Math.max(0, targetCoverDays) - currentStock);
  if (raw <= 0) return 0;
  // Tolerance stops 24.000000001 (float noise) from becoming 25.
  return wholeUnits ? Math.ceil(raw - 1e-9) : round(raw, 2);
}

export interface StatusInput {
  currentStock: number;
  velocity: number;
  cover: number;
  reorderPt: number;
  leadTimeDays: number;
  targetCoverDays: number;
  sold30d: number;
}

export function classify(input: StatusInput): { status: ProductStatus; flags: Recommendation['flags'] } {
  const { currentStock, velocity, cover, reorderPt, leadTimeDays, targetCoverDays, sold30d } = input;

  const deadStock = sold30d <= 0;
  // "Will finish before the supplier lead time": at current velocity the stock
  // runs out before an order placed today could arrive.
  const stockoutRisk = !deadStock && velocity > 0 && cover < leadTimeDays;
  const reorderNow = !deadStock && currentStock <= reorderPt;
  const orderSoon = !deadStock && cover < targetCoverDays;
  const overstocked = !deadStock && cover > targetCoverDays + HEALTHY_BAND_DAYS;

  let status: ProductStatus;
  if (deadStock) status = 'dead_stock';
  else if (stockoutRisk) status = 'stockout_risk';
  else if (reorderNow) status = 'reorder_now';
  else if (orderSoon) status = 'order_soon';
  else if (overstocked) status = 'overstocked';
  else status = 'healthy';

  return { status, flags: { deadStock, stockoutRisk, reorderNow, orderSoon, overstocked } };
}

export function recommendForProduct(product: ProductInput, options: CalculationOptions & { asOf: string }): Recommendation {
  const asOf = options.asOf;
  const wholeUnits = options.wholeUnits ?? true;

  const currentStock = Math.max(0, safeNumber(product.currentStock));
  const leadTimeDays = Math.max(0, Math.round(safeNumber(product.leadTimeDays, 2)));
  const targetCoverDays = Math.max(1, Math.round(safeNumber(product.targetCoverDays, 10)));
  const safetyStock = Math.max(0, safeNumber(product.safetyStock));

  const sold14d = sumSalesInWindow(product.sales, asOf, VELOCITY_WINDOW_DAYS);
  const sold30d = sumSalesInWindow(product.sales, asOf, DEAD_STOCK_WINDOW_DAYS);
  const velocity = sold14d / VELOCITY_WINDOW_DAYS;
  const cover = daysOfCover(currentStock, velocity);
  const reorderPt = reorderPoint(velocity, leadTimeDays, safetyStock);
  const { status, flags } = classify({ currentStock, velocity, cover, reorderPt, leadTimeDays, targetCoverDays, sold30d });

  // Dead stock is never reordered, whatever the formula says.
  const recommendedQuantity = flags.deadStock
    ? 0
    : recommendedOrderQuantity(velocity, targetCoverDays, currentStock, wholeUnits);

  const unitCost = product.unitCost == null ? null : safeNumber(product.unitCost, Number.NaN);
  const estimatedCost = unitCost == null || !Number.isFinite(unitCost) ? null : round(recommendedQuantity * unitCost, 2);

  let lastSaleDate: string | null = null;
  let lastDay = Number.NEGATIVE_INFINITY;
  for (const s of product.sales) {
    const d = dayNumber(s.saleDate);
    if (Number.isFinite(d) && safeNumber(s.quantitySold) > 0 && d > lastDay) {
      lastDay = d;
      lastSaleDate = s.saleDate.slice(0, 10);
    }
  }

  return {
    productId: product.id,
    name: product.name,
    sku: product.sku ?? null,
    category: product.category ?? null,
    supplierId: product.supplierId ?? null,
    supplierName: product.supplierName ?? null,
    unitCost: unitCost != null && Number.isFinite(unitCost) ? unitCost : null,
    currentStock,
    leadTimeDays,
    targetCoverDays,
    safetyStock,
    sold14d: round(sold14d, 3),
    sold30d: round(sold30d, 3),
    dailyVelocity: round(velocity, 3),
    daysOfCover: Number.isFinite(cover) ? round(cover, 1) : Number.POSITIVE_INFINITY,
    reorderPoint: round(reorderPt, 2),
    recommendedQuantity,
    estimatedCost,
    status,
    flags,
    lastSaleDate,
  };
}

export interface RecommendationSummary {
  asOf: string;
  totalProducts: number;
  reorderNow: number;
  stockoutRisk: number;
  orderSoon: number;
  healthy: number;
  overstocked: number;
  deadStock: number;
  /** sum of estimatedCost over products with a recommended quantity > 0 */
  estimatedOrderCost: number;
  /** count of products with recommendedQuantity > 0 but no unit cost */
  itemsMissingCost: number;
}

export function summarize(recs: Recommendation[], asOf: string): RecommendationSummary {
  const s: RecommendationSummary = {
    asOf,
    totalProducts: recs.length,
    reorderNow: 0,
    stockoutRisk: 0,
    orderSoon: 0,
    healthy: 0,
    overstocked: 0,
    deadStock: 0,
    estimatedOrderCost: 0,
    itemsMissingCost: 0,
  };
  for (const r of recs) {
    if (r.flags.deadStock) s.deadStock++;
    if (r.flags.stockoutRisk) s.stockoutRisk++;
    if (r.flags.reorderNow) s.reorderNow++;
    if (r.status === 'order_soon') s.orderSoon++;
    if (r.status === 'healthy') s.healthy++;
    if (r.flags.overstocked) s.overstocked++;
    if (r.recommendedQuantity > 0) {
      if (r.estimatedCost == null) s.itemsMissingCost++;
      else s.estimatedOrderCost += r.estimatedCost;
    }
  }
  s.estimatedOrderCost = round(s.estimatedOrderCost, 2);
  return s;
}

/** Sort order for "what should I order today": most urgent first. */
const STATUS_RANK: Record<ProductStatus, number> = {
  stockout_risk: 0,
  reorder_now: 1,
  order_soon: 2,
  healthy: 3,
  overstocked: 4,
  dead_stock: 5,
};

export function sortByUrgency(recs: Recommendation[]): Recommendation[] {
  return [...recs].sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    const ca = Number.isFinite(a.daysOfCover) ? a.daysOfCover : Number.MAX_SAFE_INTEGER;
    const cb = Number.isFinite(b.daysOfCover) ? b.daysOfCover : Number.MAX_SAFE_INTEGER;
    if (ca !== cb) return ca - cb;
    return b.dailyVelocity - a.dailyVelocity;
  });
}

export interface RecommendationResult {
  asOf: string;
  recommendations: Recommendation[];
  summary: RecommendationSummary;
}

/**
 * Run the full calculation for a store. Sorted most-urgent first.
 */
export function calculateRecommendations(products: ProductInput[], options: CalculationOptions = {}): RecommendationResult {
  const asOf = options.asOf ?? latestSaleDate(products);
  const recs = sortByUrgency(products.map((p) => recommendForProduct(p, { ...options, asOf })));
  return { asOf, recommendations: recs, summary: summarize(recs, asOf) };
}

/** Group reorder lines by supplier for purchase-order creation. */
export function groupBySupplier(recs: Recommendation[]): Map<string | null, Recommendation[]> {
  const groups = new Map<string | null, Recommendation[]>();
  for (const r of recs) {
    if (r.recommendedQuantity <= 0) continue;
    const key = r.supplierId ?? null;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  return groups;
}
