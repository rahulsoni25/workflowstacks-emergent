# OrderSense AI

**Upload your POS report. Know what to order today.**

A mobile-first web app for small grocery stores, mini-marts, bakeries and butchers.
The owner uploads a daily or weekly CSV/Excel export from their point-of-sale system;
OrderSense calculates sales velocity, stock cover and reorder quantities, then turns the
result into a purchase order they can download (PDF/Excel) or send to a supplier on WhatsApp.
English and Arabic (RTL) throughout.

> **Architecture rule:** every quantity is computed by deterministic TypeScript in
> `lib/calculations/reorder.ts`. Claude is used only to map messy column names, tidy product
> names, merge duplicates, explain the numbers in plain words, and draft WhatsApp messages.
> Claude never decides what or how much to order.

---

## 1. Folder structure

```
apps/ordersense/
├── app/
│   ├── layout.tsx                      # html lang/dir, I18n provider, toasts
│   ├── page.tsx                        # -> /dashboard
│   ├── login/page.tsx                  # Supabase email + password
│   ├── onboarding/page.tsx             # create store -> defaults -> first upload
│   ├── (app)/                          # signed-in shell (header + bottom nav)
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx          # "What should I order today?"
│   │   ├── upload/page.tsx             # upload wizard (parse -> map -> import)
│   │   ├── products/page.tsx           # tabs, search, product drawer
│   │   ├── purchase-orders/page.tsx    # drafts / sent
│   │   ├── purchase-orders/[id]/page.tsx
│   │   └── settings/page.tsx           # store, suppliers, language, weekly summary
│   ├── (print)/purchase-orders/[id]/print/page.tsx   # print-ready PO ("Save as PDF")
│   ├── api/
│   │   ├── ai/map-columns/route.ts             # Claude: column mapping (strict JSON)
│   │   ├── ai/explain-recommendations/route.ts # Claude: en/ar explanations + WhatsApp drafts
│   │   ├── ai/whatsapp/route.ts                # Claude: one supplier message for a PO
│   │   ├── ai/weekly-summary/route.ts          # Claude: weekly purchasing insights
│   │   ├── uploads/parse/route.ts              # read file, return headers/sample/mapping
│   │   ├── uploads/commit/route.ts             # apply mapping, write products + sales
│   │   ├── purchase-orders/[id]/xlsx/route.ts  # Excel download
│   │   └── health/route.ts
│   └── auth/{callback,signout}/route.ts
├── actions/                            # server actions (zod-validated)
│   ├── store.ts  suppliers.ts  products.ts  purchase-orders.ts
├── components/
│   ├── ui/                             # shadcn-style primitives (button, card, table, …)
│   ├── app-shell.tsx  recommendation-table.tsx  explain-panel.tsx
│   ├── upload-wizard.tsx  column-mapper.tsx  product-list.tsx  product-drawer.tsx
│   ├── po-editor.tsx  supplier-manager.tsx  store-settings-form.tsx  weekly-summary.tsx
│   └── login-form.tsx  onboarding-wizard.tsx  status-badge.tsx  stat-card.tsx
├── lib/
│   ├── calculations/reorder.ts         # ★ deterministic velocity / cover / reorder logic
│   ├── calculations/reorder.test.ts
│   ├── parsing/parse-file.ts           # PapaParse (CSV) + SheetJS (Excel)
│   ├── parsing/heuristics.ts           # name-based column matching (fallback for Claude)
│   ├── parsing/normalize.ts            # dirty numbers/dates -> clean products + sales
│   ├── imports/import-upload.ts        # idempotent writes to Supabase
│   ├── ai/{client,prompts,schemas,map-columns,clean-products,explain}.ts
│   ├── po/{whatsapp,excel,reasons}.ts
│   ├── supabase/{server,client,middleware}.ts
│   ├── db/{types,queries}.ts
│   ├── i18n/{dictionaries,context,server}.ts
│   └── types.ts  utils.ts
├── supabase/
│   ├── migrations/0001_init.sql        # schema, RLS, storage bucket, sales_window()
│   └── seed.sql                        # demo store (generated)
├── scripts/make-demo-data.mjs          # regenerates seed.sql + public/demo/demo-pos-export.csv
├── public/demo/demo-pos-export.csv     # messy sample POS export
├── middleware.ts                       # session refresh + auth redirects
└── .env.example
```

## 2. Core calculation

`lib/calculations/reorder.ts` (pure functions, 100% unit-tested):

| Value | Formula |
|---|---|
| `dailyVelocity` | sum(quantity_sold, last 14 days) / 14 |
| `daysOfCover` | current_stock / dailyVelocity (∞ when velocity is 0) |
| `reorderPoint` | dailyVelocity × lead_time_days + safety_stock |
| `recommendedQuantity` | max(0, dailyVelocity × target_cover_days − current_stock), rounded up |

Status precedence (one primary status per product, plus independent flags):

| Status | Rule | Colour |
|---|---|---|
| `dead_stock` | no sales in the last 30 days | grey |
| `stockout_risk` | daysOfCover < lead_time_days | red |
| `reorder_now` | current_stock ≤ reorderPoint | red |
| `order_soon` | daysOfCover < target_cover_days | amber |
| `healthy` | target ≤ daysOfCover ≤ target + 5 | green |
| `overstocked` | daysOfCover > target + 5 | blue |

The "as of" date is the latest sale date in the data, so an export uploaded a few days late
still gives sensible numbers. Dead stock is never reordered, whatever the formula says.

## 3. Claude integration

All calls use `@anthropic-ai/sdk` with `client.messages.parse()` and a Zod schema passed through
`zodOutputFormat()`, so responses are constrained to strict JSON and validated on the way in.
Model: `claude-opus-5-5` by default (`ANTHROPIC_MODEL` to override).

| Route | Purpose | Guard rails |
|---|---|---|
| `POST /api/ai/map-columns` | `{ headers, rows }` → `{ mapping, confidence, issues, dateFormat }` | every mapped value must be a real header; falls back to name-based heuristics if the key is missing or the call fails |
| `POST /api/ai/explain-recommendations` | `{ productIds? }` → bilingual `summary`, `reorder[]`, `do_not_order[]`, `supplier_messages[]` | numbers are recomputed server-side and given to Claude; unknown product ids are dropped |
| `POST /api/ai/whatsapp` | `{ purchaseOrderId }` → `{ message: { en, ar } }` | quantities come from the saved order lines |
| `POST /api/ai/weekly-summary` | → `{ headline, insights[], actions[] }` | prompt forbids any number not in the input |

Name cleaning / duplicate matching runs during import (`lib/ai/clean-products.ts`, capped at
160 products per upload to stay inside a serverless time budget; toggle it off in the wizard).
Prompts live in `lib/ai/prompts.ts`.

If `ANTHROPIC_API_KEY` is unset the app still works: mapping uses heuristics, names are kept
as-is, the WhatsApp message uses the deterministic template, and the explain buttons show a
friendly "AI unavailable" note.

## 4. Local development

```bash
cd apps/ordersense
cp .env.example .env.local      # fill in Supabase + Anthropic keys
npm install
npm run dev                     # http://localhost:3100
npm test                        # unit + pipeline tests
npm run typecheck && npm run lint
```

### Supabase (local)

```bash
npx supabase init     # once, if you don't have supabase/config.toml
npx supabase start
npx supabase db reset # applies migrations/0001_init.sql then seed.sql
```

`seed.sql` creates **demo@ordersense.app / demo1234** with "Al Noor Mini Mart": 28 products,
8 suppliers and 30 days of sales ending today. Regenerate it with `npm run demo-data`.

## 5. Deployment

### Supabase (hosted)

1. Create a project at supabase.com. Copy **Project URL** and **anon key** from *Settings → API*.
2. *SQL editor* → paste `supabase/migrations/0001_init.sql` → Run. This creates the tables,
   row-level-security policies (owners only see their own store), the private `pos-uploads`
   storage bucket, and the `sales_window()` helper.
3. *Authentication → Providers → Email*: keep email/password on. For a frictionless demo turn
   **Confirm email** off; otherwise confirmation links land on `/auth/callback`.
4. *Authentication → URL configuration*: set **Site URL** to your Vercel URL and add
   `https://<your-domain>/auth/callback` to the redirect list.
5. (Optional) run `seed.sql` in the SQL editor to get the demo store. On a hosted project it
   is simpler to sign up normally and upload `public/demo/demo-pos-export.csv`.

### Vercel

1. *Add New → Project*, import this repository.
2. **Root Directory: `apps/ordersense`** (Framework: Next.js is auto-detected).
3. Environment variables:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
   | `ANTHROPIC_API_KEY` | from console.anthropic.com |
   | `ANTHROPIC_MODEL` | optional, defaults to `claude-opus-5-5` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` |

4. Deploy. AI and import routes declare `maxDuration = 60`; enable *Fluid compute* (default on
   new projects) so that limit applies on the Hobby plan.
5. Check `https://<your-domain>/api/health` → `{ ok: true, supabase: true, ai: true }`.

This app is a separate Vercel project from the WorkflowStacks site at the repository root; the
root `vercel.json` (ignored-build script, crons) does not apply to it.

## 6. Demo walkthrough (for a grocery owner)

1. **Sign up** at `/login` with your email and a password. Tap *Create account*.
2. **Set up your store** (`/onboarding`): name, currency (AED), language (English or العربية).
   Then two questions: *how many days does a delivery take?* (2) and *how many days of stock do
   you want to keep?* (10). Tap *Create store*.
3. **Upload a report**: tap the big upload box and choose `demo-pos-export.csv` (download it
   from the Upload page). The file has a title line, ALL-CAPS names, "AED 4.20" prices and
   dd/mm/yyyy dates. In a few seconds the app shows *Check the columns* with every field matched
   and a confidence score. Required fields are marked; if one is missing it is highlighted in red
   and you pick the column yourself. Tap *Import*.
4. **Dashboard** (`/dashboard`): "What should I order today?" with four cards (Reorder now,
   Stockout risk, Overstocked, Dead stock) and a list of recommended reorders. Each row shows
   stock, sales per day, days left and the suggested quantity. Milk shows red: 9 on hand, about
   18 sold a day, delivery takes 2 days. Mentos shows blue: 90 on hand, 4 a day.
5. Tap **Explain in plain words** for a short English/Arabic explanation of why each item is
   on the list, what happens if you don't order, which items to hold, and a ready WhatsApp
   message per supplier.
6. Tick the items you want (all are pre-selected) and tap **Create purchase order**. One draft
   order per supplier is created.
7. **Purchase order**: change any quantity (set 0 to drop a line), add a note, then *Copy
   WhatsApp message* or *Send on WhatsApp* (opens wa.me with the supplier's number if saved).
   *PDF* opens a print-ready page (Save as PDF works on iPhone, Android and desktop and renders
   Arabic correctly); *Excel* downloads an .xlsx. Tap *Mark as sent*.
8. **Products** (`/products`): Fast movers, Slow movers, Dead stock, Overstocked tabs plus
   search. Tap a product to see its numbers and adjust lead time, target cover, safety stock,
   supplier, cost or stock.
9. **Settings**: edit store defaults (and push them to every product), manage suppliers and
   their WhatsApp numbers, switch language, and generate the *Weekly purchasing insights*.
10. Next week, upload the new export. Products match by name, each product/day sale is
    replaced rather than doubled, and your tuned settings are kept.

## 7. Data handling notes

- Numbers accept `1,234.50`, `AED 12`, `12,5`, Arabic-Indic digits `٤٥`, `(3)`.
- Dates accept ISO, dd/mm/yyyy, mm/dd/yyyy (toggle in the wizard), `12 Oct 2026`, Excel serials.
- Negative quantities (returns) are ignored for velocity. Rows without a product name are
  skipped and counted. Nothing in the importer throws on dirty data; every anomaly is reported
  as a warning on the result screen and stored in `uploads.error_summary`.
- Products with no stock figure are set to 0 and flagged.
- Uploaded files are kept in the private `pos-uploads` bucket under `<store>/<upload>/`.

## 8. Out of scope for v1

POS replacement, accounting, invoicing, delivery management, loyalty, multi-warehouse,
ML forecasting, barcode scanning.
