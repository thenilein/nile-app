-- =============================================================================
-- Migration: 003 — Admin Panel Schema
-- Nile Ice Creams
-- Created: 2026-03-07
--
-- Rules:
--   • Fully additive — safe to run on top of migrations 001 & 002.
--   • All changes use "if not exists" guards so the migration is idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTEND: products — add stock_quantity
-- ---------------------------------------------------------------------------

alter table public.products
    add column if not exists stock_quantity integer not null default 100;

-- ---------------------------------------------------------------------------
-- 2. NEW TABLE: promotions
-- ---------------------------------------------------------------------------

create table if not exists public.promotions (
    id             uuid primary key default gen_random_uuid(),
    code           text not null unique,
    description    text,
    discount_type  text not null check (discount_type in ('flat','percent')),
    discount_value numeric(10,2) not null default 0,
    min_order      numeric(10,2) not null default 0,
    max_uses       integer,
    used_count     integer not null default 0,
    expiry_date    date,
    is_active      boolean not null default true,
    created_at     timestamptz default now(),
    updated_at     timestamptz default now()
);

create index if not exists idx_promotions_code on public.promotions(code);
create index if not exists idx_promotions_active on public.promotions(is_active);

drop trigger if exists update_promotions_updated_at on public.promotions;
create trigger update_promotions_updated_at
before update on public.promotions
for each row execute procedure public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 3. NEW TABLE: admin_logs
-- ---------------------------------------------------------------------------

create table if not exists public.admin_logs (
    id          uuid primary key default gen_random_uuid(),
    admin_id    uuid references public.profiles(id) on delete set null,
    action      text not null,           -- 'create', 'update', 'delete', 'status_change', etc.
    table_name  text not null,
    record_id   text,
    old_data    jsonb,
    new_data    jsonb,
    description text,
    created_at  timestamptz default now()
);

create index if not exists idx_admin_logs_admin_id   on public.admin_logs(admin_id);
create index if not exists idx_admin_logs_created_at on public.admin_logs(created_at desc);
create index if not exists idx_admin_logs_table_name on public.admin_logs(table_name);

-- ---------------------------------------------------------------------------
-- 4. NEW TABLE: notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
    id         uuid primary key default gen_random_uuid(),
    type       text not null,   -- 'new_order', 'low_stock', 'payment_failure'
    title      text not null,
    message    text,
    is_read    boolean not null default false,
    related_id text,
    created_at timestamptz default now()
);

create index if not exists idx_notifications_is_read on public.notifications(is_read);

-- ---------------------------------------------------------------------------
-- 5. EXTEND: orders — add order_type, payment_method, notes
-- ---------------------------------------------------------------------------

alter table public.orders
    add column if not exists order_type     text not null default 'delivery',
    add column if not exists payment_method text not null default 'cod',
    add column if not exists notes          text;

-- ---------------------------------------------------------------------------
-- 6. EXTEND: profiles — add phone, is_blocked
-- ---------------------------------------------------------------------------

alter table public.profiles
    add column if not exists phone      text,
    add column if not exists is_blocked boolean not null default false;

-- ---------------------------------------------------------------------------
-- 7. SEED: default store_settings (using existing settings table)
-- ---------------------------------------------------------------------------

insert into public.settings (key, value, description) values
    ('store_name',          '"Nile Ice Creams"',         'Display name of the store'),
    ('opening_time',        '"09:00"',                   'Store opening time (HH:MM)'),
    ('closing_time',        '"22:00"',                   'Store closing time (HH:MM)'),
    ('delivery_charge',     '40',                        'Flat delivery charge in INR'),
    ('min_order_amount',    '100',                        'Minimum order amount in INR'),
    ('tax_percentage',      '5',                          'GST percentage'),
    ('delivery_radius_km',  '10',                         'Delivery radius in km'),
    ('currency_symbol',     '"₹"',                        'Currency symbol')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY for new tables
-- ---------------------------------------------------------------------------

alter table public.promotions   enable row level security;
alter table public.admin_logs   enable row level security;
alter table public.notifications enable row level security;

-- Promotions: public read active ones; admins manage all
create policy "public read active promotions"
on public.promotions for select
using (is_active = true);

create policy "admin manage promotions"
on public.promotions for all
using (public.is_admin())
with check (public.is_admin());

-- Admin logs: admins only
create policy "admin manage logs"
on public.admin_logs for all
using (public.is_admin())
with check (public.is_admin());

-- Notifications: admins only
create policy "admin manage notifications"
on public.notifications for all
using (public.is_admin())
with check (public.is_admin());

-- Admins can fully manage categories, products, settings
create policy "admin manage categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin manage products"
on public.products for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin manage settings"
on public.settings for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin manage orders"
on public.orders for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());
