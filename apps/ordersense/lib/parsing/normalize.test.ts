import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, normalizeRows, toIsoDate, toNumber } from './normalize';
import { heuristicMapping, sanitizeMapping } from './heuristics';
import { parseCsv } from './parse-file';

test('toNumber handles currency, thousands separators, Arabic digits, parentheses', () => {
  assert.equal(toNumber('1,234.50'), 1234.5);
  assert.equal(toNumber('AED 12'), 12);
  assert.equal(toNumber('12,5'), 12.5);
  assert.equal(toNumber('1.234,50'), 1234.5);
  assert.equal(toNumber('٤٥'), 45);
  assert.equal(toNumber('(3)'), -3);
  assert.equal(toNumber(''), null);
  assert.equal(toNumber('n/a'), null);
  assert.equal(toNumber(7), 7);
});

test('toIsoDate handles ISO, day-first, month names, Excel serials', () => {
  assert.equal(toIsoDate('2026-10-12').iso, '2026-10-12');
  assert.equal(toIsoDate('12/10/2026').iso, '2026-10-12');
  assert.equal(toIsoDate('12/10/2026', false).iso, '2026-12-10');
  assert.equal(toIsoDate('25/10/2026').iso, '2026-10-25'); // unambiguous whatever the setting
  assert.equal(toIsoDate('25/10/2026', false).iso, '2026-10-25');
  assert.equal(toIsoDate('12 Oct 2026').iso, '2026-10-12');
  assert.equal(toIsoDate('Oct 12, 2026').iso, '2026-10-12');
  assert.equal(toIsoDate(46307).iso, '2026-10-12');
  assert.equal(toIsoDate('garbage').iso, null);
  assert.equal(toIsoDate('05/06/2026').ambiguous, true);
});

test('normalizeName unifies case, punctuation and Arabic variants', () => {
  assert.equal(normalizeName('  Almarai Milk 1L (Full Fat) '), 'almarai milk 1l full fat');
  assert.equal(normalizeName('حليب المراعي ١ لتر'), 'حليب المراعي 1 لتر');
  assert.equal(normalizeName('أرز'), normalizeName('ارز'));
});

test('heuristicMapping finds the standard fields from messy headers', () => {
  const headers = ['Date', 'Item Code', 'Product Name', 'Qty Sold', 'Stock On Hand', 'Cost', 'Supplier', 'Net Sales'];
  const { mapping, confidence, source } = heuristicMapping(headers);
  assert.equal(source, 'heuristic');
  assert.equal(mapping.item_name, 'Product Name');
  assert.equal(mapping.sku, 'Item Code');
  assert.equal(mapping.quantity_sold, 'Qty Sold');
  assert.equal(mapping.current_stock, 'Stock On Hand');
  assert.equal(mapping.sale_date, 'Date');
  assert.equal(mapping.unit_cost, 'Cost');
  assert.equal(mapping.supplier, 'Supplier');
  assert.equal(mapping.revenue, 'Net Sales');
  assert.ok(confidence > 0.8);
});

test('heuristicMapping works with Arabic headers', () => {
  const { mapping } = heuristicMapping(['التاريخ', 'اسم الصنف', 'الكمية المباعة', 'المخزون الحالي', 'المورد']);
  assert.equal(mapping.item_name, 'اسم الصنف');
  assert.equal(mapping.quantity_sold, 'الكمية المباعة');
  assert.equal(mapping.current_stock, 'المخزون الحالي');
  assert.equal(mapping.sale_date, 'التاريخ');
  assert.equal(mapping.supplier, 'المورد');
});

test('sanitizeMapping drops hallucinated or duplicate columns', () => {
  const headers = ['Product', 'Qty'];
  const m = sanitizeMapping({ item_name: 'Product', quantity_sold: 'qty', current_stock: 'Stock On Hand', sku: 'Product' }, headers);
  assert.equal(m.item_name, 'Product');
  assert.equal(m.quantity_sold, 'Qty');
  assert.equal(m.current_stock, null);
  assert.equal(m.sku, null);
});

test('parseCsv skips a title line and handles BOM and semicolons', () => {
  const csv = '﻿Sales report October\nProduct;Qty Sold;Stock\nMilk;3;10\n\nBread;2;4\n';
  const file = parseCsv(Buffer.from(csv, 'utf8'));
  assert.deepEqual(file.headers, ['Product', 'Qty Sold', 'Stock']);
  assert.equal(file.rows.length, 2);
  assert.equal(file.rows[1].Product, 'Bread');
});

test('normalizeRows aggregates by product+day and keeps the latest stock figure', () => {
  const rows = [
    { Product: 'Milk 1L', Date: '10/10/2026', Qty: '3', Stock: '20', Cost: '3.5', Supplier: 'Almarai' },
    { Product: 'milk 1l', Date: '10/10/2026', Qty: '2', Stock: '18', Cost: '', Supplier: '' },
    { Product: 'Milk 1L', Date: '11/10/2026', Qty: 'x', Stock: '15', Cost: '3.6', Supplier: 'Almarai' },
    { Product: '', Date: '11/10/2026', Qty: '1', Stock: '1', Cost: '', Supplier: '' },
  ];
  const mapping = {
    item_name: 'Product', sale_date: 'Date', quantity_sold: 'Qty', current_stock: 'Stock', unit_cost: 'Cost', supplier: 'Supplier',
    sku: null, barcode: null, category: null, revenue: null,
  };
  const r = normalizeRows(rows, mapping, { reportDate: '2026-10-12' });
  assert.equal(r.products.length, 1);
  assert.equal(r.products[0].currentStock, 15);
  assert.equal(r.products[0].unitCost, 3.6);
  assert.equal(r.products[0].supplierName, 'Almarai');
  assert.equal(r.sales.length, 2);
  assert.equal(r.sales.find((s) => s.saleDate === '2026-10-10')?.quantitySold, 5);
  assert.equal(r.sales.find((s) => s.saleDate === '2026-10-11')?.quantitySold, 0);
  assert.equal(r.issues.find((i) => i.code === 'bad_number')?.count, 1);
  assert.equal(r.issues.find((i) => i.code === 'skipped_no_name')?.count, 1);
  assert.deepEqual(r.dateRange, { from: '2026-10-10', to: '2026-10-11' });
});

test('normalizeRows uses the report date when there is no date column', () => {
  const rows = [{ Product: 'Eggs', Qty: '12', Stock: '30' }];
  const mapping = { item_name: 'Product', quantity_sold: 'Qty', current_stock: 'Stock', sale_date: null, sku: null, barcode: null, category: null, revenue: null, unit_cost: null, supplier: null };
  const r = normalizeRows(rows, mapping, { reportDate: '2026-10-12' });
  assert.equal(r.sales[0].saleDate, '2026-10-12');
});
