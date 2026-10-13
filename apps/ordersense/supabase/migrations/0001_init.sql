-- OrderSense AI - initial schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  currency    text not null default 'AED',
  country     text not null default 'AE',
  language    text not null default 'en' check (language in ('en', 'ar')),
  -- store-wide defaults applied to products that have no override
  default_lead_time_days    integer not null default 2  check (default_lead_time_days between 0 and 90),
  default_target_cover_days integer not null default 10 check (default_target_cover_days between 1 and 120),
  created_at  timestamptz not null default now()
);

create table if not exists public.suppliers (
  id                     uuid primary key default gen_random_uuid(),
  store_id               uuid not null references public.stores (id) on delete cascade,
  name                   text not null,
  whatsapp_number        text,
  default_lead_time_days integer not null default 2 check (default_lead_time_days between 0 and 90),
  created_at             timestamptz not null default now(),
  unique (store_id, name)
);

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores (id) on delete cascade,
  name              text not null,
  normalized_name   text not null,
  sku               text,
  barcode           text,
  category          text,
  supplier_id       uuid references public.suppliers (id) on delete set null,
  unit_cost         numeric(12, 3),
  current_stock     numeric(12, 3) not null default 0,
  lead_time_days    integer not null default 2  check (lead_time_days between 0 and 90),
  target_cover_days integer not null default 10 check (target_cover_days between 1 and 120),
  safety_stock      integer not null default 0  check (safety_stock >= 0),
  stock_updated_at  date,
  created_at        timestamptz not null default now(),
  unique (store_id, normalized_name)
);

create table if not exists public.sales (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  sale_date     date not null,
  quantity_sold numeric(12, 3) not null default 0,
  revenue       numeric(12, 3),
  created_at    timestamptz not null default now(),
  -- one row per product per day: re-uploading the same report replaces, not doubles
  unique (product_id, sale_date)
);

create table if not exists public.uploads (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores (id) on delete cascade,
  file_url      text,
  file_name     text,
  status        text not null default 'pending' check (status in ('pending', 'mapped', 'processed', 'failed')),
  row_count     integer,
  column_mapping jsonb,
  error_summary jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id                   uuid primary key default gen_random_uuid(),
  store_id             uuid not null references public.stores (id) on delete cascade,
  supplier_id          uuid references public.suppliers (id) on delete set null,
  status               text not null default 'draft' check (status in ('draft', 'sent', 'received', 'cancelled')),
  total_estimated_cost numeric(14, 3) not null default 0,
  notes                text,
  created_at           timestamptz not null default now(),
  sent_at              timestamptz
);

create table if not exists public.purchase_order_items (
  id                   uuid primary key default gen_random_uuid(),
  purchase_order_id    uuid not null references public.purchase_orders (id) on delete cascade,
  product_id           uuid not null references public.products (id) on delete cascade,
  recommended_quantity numeric(12, 3) not null default 0,
  final_quantity       numeric(12, 3) not null default 0,
  unit_cost            numeric(12, 3),
  reason               text,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists stores_owner_idx            on public.stores (owner_id);
create index if not exists products_store_idx          on public.products (store_id);
create index if not exists products_supplier_idx       on public.products (supplier_id);
create index if not exists sales_store_date_idx        on public.sales (store_id, sale_date desc);
create index if not exists sales_product_date_idx      on public.sales (product_id, sale_date desc);
create index if not exists uploads_store_idx           on public.uploads (store_id, created_at desc);
create index if not exists purchase_orders_store_idx   on public.purchase_orders (store_id, created_at desc);
create index if not exists po_items_po_idx             on public.purchase_order_items (purchase_order_id);

-- ---------------------------------------------------------------------------
-- Row level security: an owner sees only their own store's rows.
-- ---------------------------------------------------------------------------

alter table public.stores               enable row level security;
alter table public.suppliers            enable row level security;
alter table public.products             enable row level security;
alter table public.sales                enable row level security;
alter table public.uploads              enable row level security;
alter table public.purchase_orders      enable row level security;
alter table public.purchase_order_items enable row level security;

create or replace function public.is_store_owner(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores s
    where s.id = p_store_id and s.owner_id = auth.uid()
  );
$$;

drop policy if exists stores_owner_all on public.stores;
create policy stores_owner_all on public.stores
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists suppliers_owner_all on public.suppliers;
create policy suppliers_owner_all on public.suppliers
  for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

drop policy if exists products_owner_all on public.products;
create policy products_owner_all on public.products
  for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

drop policy if exists sales_owner_all on public.sales;
create policy sales_owner_all on public.sales
  for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

drop policy if exists uploads_owner_all on public.uploads;
create policy uploads_owner_all on public.uploads
  for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

drop policy if exists purchase_orders_owner_all on public.purchase_orders;
create policy purchase_orders_owner_all on public.purchase_orders
  for all using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));

drop policy if exists po_items_owner_all on public.purchase_order_items;
create policy po_items_owner_all on public.purchase_order_items
  for all using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id and public.is_store_owner(po.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id and public.is_store_owner(po.store_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for raw POS exports (private; owner-scoped by path prefix)
-- Path convention: <store_id>/<upload_id>/<file name>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pos-uploads', 'pos-uploads', false, 10485760,
  array['text/csv', 'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream', 'text/plain']
)
on conflict (id) do nothing;

drop policy if exists pos_uploads_owner_rw on storage.objects;
create policy pos_uploads_owner_rw on storage.objects
  for all
  using (
    bucket_id = 'pos-uploads'
    and public.is_store_owner(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'pos-uploads'
    and public.is_store_owner(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Sales window helper used by the dashboard: everything needed for the
-- deterministic calculation in one round trip.
-- ---------------------------------------------------------------------------

create or replace function public.sales_window(p_store_id uuid, p_days integer default 30)
returns table (product_id uuid, sale_date date, quantity_sold numeric)
language sql
stable
security invoker
as $$
  with latest as (
    select coalesce(max(sale_date), current_date) as as_of
    from public.sales where store_id = p_store_id
  )
  select s.product_id, s.sale_date, s.quantity_sold
  from public.sales s, latest
  where s.store_id = p_store_id
    and s.sale_date > latest.as_of - make_interval(days => p_days)
  order by s.sale_date desc;
$$;
