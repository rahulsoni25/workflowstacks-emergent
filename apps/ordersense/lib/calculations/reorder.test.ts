import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRecommendations,
  classify,
  dailyVelocity,
  daysOfCover,
  recommendedOrderQuantity,
  reorderPoint,
  sumSalesInWindow,
  type ProductInput,
  type SaleRecord,
} from './reorder';

function dailySales(from: string, days: number, qty: number): SaleRecord[] {
  const out: SaleRecord[] = [];
  const start = new Date(from + 'T00:00:00Z');
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() - i * 86_400_000);
    out.push({ saleDate: d.toISOString().slice(0, 10), quantitySold: qty });
  }
  return out;
}

const base: Omit<ProductInput, 'id' | 'name' | 'sales' | 'currentStock'> = {
  leadTimeDays: 2,
  targetCoverDays: 10,
  safetyStock: 0,
};

test('velocity is the 14-day sum divided by 14', () => {
  const sales = dailySales('2026-10-12', 20, 3); // 20 days of 3/day
  assert.equal(sumSalesInWindow(sales, '2026-10-12', 14), 42);
  assert.equal(dailyVelocity(sales, '2026-10-12'), 3);
});

test('sales outside the window are ignored', () => {
  const sales: SaleRecord[] = [
    { saleDate: '2026-10-12', quantitySold: 10 },
    { saleDate: '2026-09-28', quantitySold: 100 }, // exactly 14 days before -> excluded
    { saleDate: '2026-09-29', quantitySold: 4 }, // 13 days before -> included
  ];
  assert.equal(sumSalesInWindow(sales, '2026-10-12', 14), 14);
});

test('core formulas match the spec', () => {
  assert.equal(daysOfCover(30, 3), 10);
  assert.equal(reorderPoint(3, 2, 5), 11);
  assert.equal(recommendedOrderQuantity(3, 10, 12), 18);
  assert.equal(recommendedOrderQuantity(3, 10, 40), 0);
  assert.equal(recommendedOrderQuantity(2.5, 10, 0), 25);
  assert.equal(recommendedOrderQuantity(1.1, 10, 0), 11); // rounds up to whole units
});

test('zero velocity gives infinite cover when stocked, zero when empty', () => {
  assert.equal(daysOfCover(10, 0), Number.POSITIVE_INFINITY);
  assert.equal(daysOfCover(0, 0), 0);
});

test('status: reorder now when stock <= reorder point', () => {
  const r = classify({ currentStock: 6, velocity: 3, cover: 2, reorderPt: 6, leadTimeDays: 2, targetCoverDays: 10, sold30d: 50 });
  // cover (2) is not < leadTime (2) so it's not a stockout risk, but it is at the reorder point
  assert.equal(r.status, 'reorder_now');
  assert.equal(r.flags.reorderNow, true);
  assert.equal(r.flags.stockoutRisk, false);
});

test('status: stockout risk when stock runs out before lead time', () => {
  const r = classify({ currentStock: 2, velocity: 3, cover: 0.67, reorderPt: 6, leadTimeDays: 2, targetCoverDays: 10, sold30d: 50 });
  assert.equal(r.status, 'stockout_risk');
  assert.equal(r.flags.reorderNow, true);
});

test('status: order soon when cover below target but above reorder point', () => {
  const r = classify({ currentStock: 20, velocity: 3, cover: 6.67, reorderPt: 6, leadTimeDays: 2, targetCoverDays: 10, sold30d: 50 });
  assert.equal(r.status, 'order_soon');
});

test('status: healthy inside [target, target+5]', () => {
  assert.equal(classify({ currentStock: 30, velocity: 3, cover: 10, reorderPt: 6, leadTimeDays: 2, targetCoverDays: 10, sold30d: 50 }).status, 'healthy');
  assert.equal(classify({ currentStock: 45, velocity: 3, cover: 15, reorderPt: 6, leadTimeDays: 2, targetCoverDays: 10, sold30d: 50 }).status, 'healthy');
});

test('status: overstocked above target+5', () => {
  assert.equal(classify({ currentStock: 48, velocity: 3, cover: 16, reorderPt: 6, leadTimeDays: 2, targetCoverDays: 10, sold30d: 50 }).status, 'overstocked');
});

test('status: dead stock when nothing sold in 30 days, and quantity is zero', () => {
  const product: ProductInput = {
    id: 'p1',
    name: 'Old tin',
    currentStock: 40,
    ...base,
    sales: [{ saleDate: '2026-08-01', quantitySold: 5 }],
  };
  const { recommendations } = calculateRecommendations([product], { asOf: '2026-10-12' });
  assert.equal(recommendations[0].status, 'dead_stock');
  assert.equal(recommendations[0].recommendedQuantity, 0);
  assert.equal(recommendations[0].daysOfCover, Number.POSITIVE_INFINITY);
});

test('end to end: as-of defaults to the latest sale date and sorting is most urgent first', () => {
  const milk: ProductInput = { id: 'milk', name: 'Milk 1L', currentStock: 4, ...base, unitCost: 3.5, sales: dailySales('2026-10-10', 14, 6) };
  const rice: ProductInput = { id: 'rice', name: 'Rice 5kg', currentStock: 80, ...base, unitCost: 20, sales: dailySales('2026-10-10', 14, 2) };
  const soap: ProductInput = { id: 'soap', name: 'Soap', currentStock: 12, ...base, unitCost: 2, sales: dailySales('2026-10-10', 14, 1) };

  const result = calculateRecommendations([rice, soap, milk]);
  assert.equal(result.asOf, '2026-10-10');
  assert.deepEqual(
    result.recommendations.map((r) => r.productId),
    ['milk', 'soap', 'rice'],
  );
  const m = result.recommendations[0];
  assert.equal(m.dailyVelocity, 6);
  assert.equal(m.status, 'stockout_risk');
  assert.equal(m.recommendedQuantity, 56); // 6*10 - 4
  assert.equal(m.estimatedCost, 196);
  assert.equal(result.summary.reorderNow, 1);
  assert.equal(result.summary.stockoutRisk, 1);
  assert.equal(result.summary.overstocked, 1); // rice: 80/2 = 40 days
  assert.equal(result.summary.estimatedOrderCost, 196);
});

test('dirty input never throws', () => {
  const p: ProductInput = {
    id: 'x',
    name: 'Weird',
    currentStock: Number.NaN,
    leadTimeDays: -3,
    targetCoverDays: 0,
    safetyStock: -1,
    sales: [{ saleDate: 'not-a-date', quantitySold: Number.NaN }, { saleDate: '2026-10-01', quantitySold: -5 }],
  };
  const { recommendations } = calculateRecommendations([p], { asOf: '2026-10-12' });
  assert.equal(recommendations[0].status, 'dead_stock');
  assert.equal(recommendations[0].recommendedQuantity, 0);
  assert.equal(recommendations[0].currentStock, 0);
});
