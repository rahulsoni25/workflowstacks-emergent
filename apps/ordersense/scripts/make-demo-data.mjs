#!/usr/bin/env node
/**
 * Generates the demo grocery store data set, deterministically:
 *   public/demo/demo-pos-export.csv   - a messy "POS export" to upload in the UI
 *   supabase/seed.sql                 - the same store pre-loaded (demo@ordersense.app / demo1234)
 *
 * Run: node scripts/make-demo-data.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const DAYS = 30;
const LAST_DAY = new Date(Date.UTC(2026, 9, 12)); // 2026-10-12, the CSV's final day

// name, sku, category, supplier, cost, base units/day, stock on the last day, pattern
// pattern: 'steady' | 'weekend' | 'dead' (no sales in 30d) | 'fading' (sold early, then nothing) | 'spike'
const PRODUCTS = [
  ['Almarai Full Fat Milk 1L', 'MLK-001', 'Dairy', 'Almarai', 4.2, 18, 9, 'steady'],
  ['Almarai Laban 1L', 'MLK-002', 'Dairy', 'Almarai', 3.8, 9, 30, 'steady'],
  ['Almarai Yoghurt 170g', 'MLK-003', 'Dairy', 'Almarai', 1.6, 14, 20, 'steady'],
  ['Al Rawabi Eggs 30pc', 'EGG-001', 'Dairy', 'Al Rawabi', 14.5, 6, 4, 'steady'],
  ['Arabic Bread 6pc', 'BRD-001', 'Bakery', 'Modern Bakery', 1.2, 42, 15, 'steady'],
  ['Sliced White Bread 600g', 'BRD-002', 'Bakery', 'Modern Bakery', 3.0, 11, 26, 'steady'],
  ['Croissant Butter', 'BRD-003', 'Bakery', 'Modern Bakery', 2.1, 7, 60, 'weekend'],
  ['Pepsi 330ml Can', 'BEV-001', 'Beverages', 'Pepsi Dubai', 1.4, 25, 48, 'steady'],
  ['Al Ain Water 500ml x12', 'BEV-002', 'Beverages', 'Agthia', 6.0, 10, 95, 'steady'],
  ['Red Bull 250ml', 'BEV-003', 'Beverages', 'Pepsi Dubai', 5.5, 5, 7, 'steady'],
  ['Lipton Yellow Label 100 bags', 'GRO-001', 'Grocery', 'Unilever Gulf', 11.0, 2, 3, 'steady'],
  ['Al Alali Tomato Paste 400g', 'GRO-002', 'Grocery', 'Al Alali', 2.9, 3, 70, 'steady'],
  ['Sunflower Oil 1.8L', 'GRO-003', 'Grocery', 'Al Alali', 13.0, 2.5, 6, 'steady'],
  ['Basmati Rice 5kg', 'GRO-004', 'Grocery', 'Al Alali', 24.0, 1.5, 9, 'steady'],
  ['Sugar 2kg', 'GRO-005', 'Grocery', 'Al Alali', 6.5, 3, 12, 'steady'],
  ['Lays Chips 45g', 'SNK-001', 'Snacks', 'Pepsi Dubai', 1.5, 20, 160, 'steady'],
  ['Galaxy Chocolate 40g', 'SNK-002', 'Snacks', 'Mars Gulf', 1.9, 12, 14, 'steady'],
  ['Mentos Mint', 'SNK-003', 'Snacks', 'Mars Gulf', 1.1, 4, 90, 'steady'],
  ['Bananas 1kg', 'FRV-001', 'Fruit & Veg', 'Fresh Fruits Co', 4.5, 9, 3, 'steady'],
  ['Tomatoes 1kg', 'FRV-002', 'Fruit & Veg', 'Fresh Fruits Co', 3.9, 7, 8, 'steady'],
  ['Onions 1kg', 'FRV-003', 'Fruit & Veg', 'Fresh Fruits Co', 2.4, 5, 25, 'steady'],
  ['Fairy Dish Soap 750ml', 'HH-001', 'Household', 'Unilever Gulf', 8.2, 1.5, 11, 'steady'],
  ['Clorox Bleach 1L', 'HH-002', 'Household', 'Unilever Gulf', 5.0, 0.8, 2, 'steady'],
  ['Ramadan Dates Gift Box 1kg', 'SEA-001', 'Seasonal', 'Al Alali', 38.0, 0, 22, 'dead'],
  ['Christmas Cake Tin 500g', 'SEA-002', 'Seasonal', 'Modern Bakery', 17.0, 0, 9, 'dead'],
  ['Imported Cereal Choco 375g', 'GRO-006', 'Grocery', 'Unilever Gulf', 15.5, 0.5, 40, 'fading'],
  ['Ice Cream Tub Vanilla 1L', 'FRZ-001', 'Frozen', 'Almarai', 12.0, 3, 5, 'spike'],
  ['Chicken Breast 1kg', 'MEA-001', 'Meat', 'Fresh Fruits Co', 22.0, 4, 2, 'steady'],
];

// Deterministic pseudo-random in [0, 1)
function rnd(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function dmy(d) {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

function unitsSold(p, idx, dayOffset, date) {
  const [, , , , , base, , pattern] = p;
  const dow = date.getUTCDay(); // 5 = Fri, 6 = Sat (Gulf weekend)
  const noise = 0.7 + rnd(idx * 100 + dayOffset) * 0.6;
  switch (pattern) {
    case 'dead':
      return 0;
    case 'fading':
      return dayOffset > 22 ? Math.round(base * 4 * noise) : 0; // sold at the start of the window only
    case 'weekend':
      return Math.round(base * (dow === 5 || dow === 6 ? 2.2 : 0.6) * noise);
    case 'spike':
      return Math.round(base * (dayOffset < 5 ? 2.5 : 0.8) * noise); // hot week
    default:
      return Math.round(base * (dow === 5 ? 1.4 : 1) * noise);
  }
}

// Build daily rows, working backwards from the last day so stock on hand is consistent.
const rows = [];
const seedSales = [];
PRODUCTS.forEach((p, idx) => {
  const [name, sku, category, supplier, cost, , finalStock] = p;
  let stock = finalStock;
  const daily = [];
  for (let off = 0; off < DAYS; off++) {
    const date = new Date(LAST_DAY.getTime() - off * 86_400_000);
    const qty = unitsSold(p, idx, off, date);
    daily.push({ date, qty, stock, off });
    stock += qty; // stock before that day's sales
    // a delivery every ~7 days for live products
    if (off % 7 === 6 && p[7] !== 'dead') stock = Math.max(0, stock - Math.round(p[5] * 7));
  }
  daily.reverse().forEach((d) => {
    rows.push({ date: d.date, sku, name, category, qty: d.qty, stock: d.stock, cost, supplier });
    seedSales.push({ idx, off: d.off, qty: d.qty });
  });
});

// ---- CSV: deliberately messy (title line, mixed casing, thousands separators, a trailing note) ----
const csvLines = [
  'Daily Sales & Stock Report - Al Noor Mini Mart',
  'Date,Item Code,Product Name,Category,Qty Sold,Stock On Hand,Cost,Supplier',
  ...rows.map((r) => {
    const messyName = r.sku.endsWith('1') ? r.name.toUpperCase() : r.name;
    const stock = r.stock >= 1000 ? `"${r.stock.toLocaleString('en-US')}"` : String(r.stock);
    return [dmy(r.date), r.sku, `"${messyName}"`, r.category, r.qty, stock, `AED ${r.cost.toFixed(2)}`, r.supplier].join(',');
  }),
  '',
  'Report generated by DemoPOS v3',
];
mkdirSync(join(root, 'public', 'demo'), { recursive: true });
writeFileSync(join(root, 'public', 'demo', 'demo-pos-export.csv'), '﻿' + csvLines.join('\r\n'), 'utf8');

// ---- seed.sql: relative dates so the demo is always "today" ----
const USER_ID = '11111111-1111-4111-8111-111111111111';
const STORE_ID = '22222222-2222-4222-8222-222222222222';
const suppliers = [...new Set(PRODUCTS.map((p) => p[3]))];
const supplierId = (name) => `3333${String(suppliers.indexOf(name) + 1).padStart(4, '0')}-3333-4333-8333-333333333333`;
const productId = (i) => `4444${String(i + 1).padStart(4, '0')}-4444-4444-8444-444444444444`;
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const normalize = (s) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sql = [];
sql.push(`-- OrderSense AI demo seed (generated by scripts/make-demo-data.mjs)
-- Creates demo@ordersense.app / demo1234 with "Al Noor Mini Mart", ${PRODUCTS.length} products,
-- ${suppliers.length} suppliers and ${DAYS} days of sales ending today. Safe to re-run.
-- Apply with: supabase db reset   (uses this file automatically)   or paste into the SQL editor.

begin;

-- Demo auth user (local/dev projects). On a hosted project you can instead sign up normally
-- and replace the owner_id below with your user's id.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '${USER_ID}', 'authenticated', 'authenticated',
  'demo@ordersense.app', crypt('demo1234', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '${USER_ID}', '${USER_ID}',
  jsonb_build_object('sub', '${USER_ID}', 'email', 'demo@ordersense.app', 'email_verified', true),
  'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

delete from public.stores where id = '${STORE_ID}';

insert into public.stores (id, owner_id, name, currency, country, language, default_lead_time_days, default_target_cover_days)
values ('${STORE_ID}', '${USER_ID}', 'Al Noor Mini Mart', 'AED', 'AE', 'en', 2, 10);
`);

sql.push(`insert into public.suppliers (id, store_id, name, whatsapp_number, default_lead_time_days) values`);
sql.push(
  suppliers
    .map((s, i) => `  ('${supplierId(s)}', '${STORE_ID}', ${q(s)}, '97150000${String(1000 + i).slice(1)}', ${i % 3 === 0 ? 1 : 2})`)
    .join(',\n') + ';\n',
);

sql.push(`insert into public.products (id, store_id, name, normalized_name, sku, category, supplier_id, unit_cost, current_stock, lead_time_days, target_cover_days, safety_stock, stock_updated_at) values`);
sql.push(
  PRODUCTS.map((p, i) => {
    const [name, sku, category, supplier, cost, , finalStock] = p;
    return `  ('${productId(i)}', '${STORE_ID}', ${q(name)}, ${q(normalize(name))}, ${q(sku)}, ${q(category)}, '${supplierId(supplier)}', ${cost}, ${finalStock}, 2, 10, 0, current_date)`;
  }).join(',\n') + ';\n',
);

sql.push(`insert into public.sales (store_id, product_id, sale_date, quantity_sold) values`);
sql.push(seedSales.map((s) => `  ('${STORE_ID}', '${productId(s.idx)}', current_date - ${s.off}, ${s.qty})`).join(',\n') + '\non conflict (product_id, sale_date) do update set quantity_sold = excluded.quantity_sold;\n');

sql.push(`insert into public.uploads (store_id, file_name, status, row_count)
values ('${STORE_ID}', 'demo-pos-export.csv', 'processed', ${rows.length});

commit;
`);
mkdirSync(join(root, 'supabase'), { recursive: true });
writeFileSync(join(root, 'supabase', 'seed.sql'), sql.join('\n'), 'utf8');

console.log(`wrote public/demo/demo-pos-export.csv (${rows.length} rows) and supabase/seed.sql`);
