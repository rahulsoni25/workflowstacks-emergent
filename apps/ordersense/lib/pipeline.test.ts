/**
 * End-to-end check of the deterministic pipeline on the bundled demo export:
 * parse -> heuristic column mapping -> normalise -> calculate.
 * No Supabase or Claude involved.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFile } from './parsing/parse-file';
import { heuristicMapping } from './parsing/heuristics';
import { normalizeRows } from './parsing/normalize';
import { calculateRecommendations, groupBySupplier, type ProductInput } from './calculations/reorder';

test('demo CSV flows through parse -> map -> normalise -> calculate', () => {
  const buffer = readFileSync(join(process.cwd(), 'public', 'demo', 'demo-pos-export.csv'));
  const file = parseFile(buffer, 'demo-pos-export.csv', 'text/csv');

  // Title line above the header is skipped; trailing note row has one cell and is dropped by normalise.
  assert.deepEqual(file.headers, ['Date', 'Item Code', 'Product Name', 'Category', 'Qty Sold', 'Stock On Hand', 'Cost', 'Supplier']);
  assert.equal(file.rows.length, 841); // 840 data rows + the "Report generated" note

  const { mapping, confidence } = heuristicMapping(file.headers);
  assert.equal(mapping.item_name, 'Product Name');
  assert.equal(mapping.quantity_sold, 'Qty Sold');
  assert.equal(mapping.current_stock, 'Stock On Hand');
  assert.equal(mapping.sale_date, 'Date');
  assert.equal(mapping.unit_cost, 'Cost');
  assert.equal(mapping.supplier, 'Supplier');
  assert.equal(mapping.category, 'Category');
  assert.equal(mapping.sku, 'Item Code');
  assert.ok(confidence >= 0.9);

  const norm = normalizeRows(file.rows, mapping, { reportDate: '2026-10-12', dayFirst: true });
  assert.equal(norm.products.length, 28);
  assert.equal(norm.sales.length, 28 * 30);
  assert.deepEqual(norm.dateRange, { from: '2026-09-13', to: '2026-10-12' });
  // "AED 4.20" and "1,234" style cells parse cleanly
  const milk = norm.products.find((p) => p.normalizedName.includes('almarai full fat milk'))!;
  assert.equal(milk.unitCost, 4.2);
  assert.equal(milk.currentStock, 9);
  assert.equal(milk.supplierName, 'Almarai');
  assert.equal(norm.issues.find((i) => i.code === 'skipped_no_name')?.count, 1);

  const inputs: ProductInput[] = norm.products.map((p) => ({
    id: p.normalizedName,
    name: p.name,
    supplierId: p.supplierName,
    supplierName: p.supplierName,
    unitCost: p.unitCost,
    currentStock: p.currentStock ?? 0,
    leadTimeDays: 2,
    targetCoverDays: 10,
    safetyStock: 0,
    sales: norm.sales.filter((s) => s.normalizedName === p.normalizedName).map((s) => ({ saleDate: s.saleDate, quantitySold: s.quantitySold })),
  }));
  const result = calculateRecommendations(inputs);
  assert.equal(result.asOf, '2026-10-12');

  const byName = Object.fromEntries(result.recommendations.map((r) => [r.name, r]));
  // Milk: 9 on hand, ~18/day -> stockout risk with a large suggested quantity.
  assert.equal(byName['ALMARAI FULL FAT MILK 1L'].status, 'stockout_risk');
  assert.ok(byName['ALMARAI FULL FAT MILK 1L'].recommendedQuantity > 100);
  // Seasonal items never sold in the window -> dead stock, nothing ordered.
  assert.equal(byName['RAMADAN DATES GIFT BOX 1KG'].status, 'dead_stock');
  assert.equal(byName['RAMADAN DATES GIFT BOX 1KG'].recommendedQuantity, 0);
  assert.equal(byName['Christmas Cake Tin 500g'].status, 'dead_stock');
  // Mentos: 90 on hand, ~4/day -> overstocked.
  assert.equal(byName['Mentos Mint'].status, 'overstocked');
  // Summary counts are internally consistent.
  const s = result.summary;
  assert.equal(s.totalProducts, 28);
  assert.equal(s.deadStock, 2);
  assert.ok(s.reorderNow >= s.stockoutRisk);
  assert.ok(s.estimatedOrderCost > 0);
  // Most urgent first.
  assert.equal(result.recommendations[0].status, 'stockout_risk');

  // Purchase orders group by supplier and only include lines with a quantity.
  const groups = groupBySupplier(result.recommendations);
  for (const lines of groups.values()) assert.ok(lines.every((l) => l.recommendedQuantity > 0));
  assert.ok(groups.size >= 3);
});
