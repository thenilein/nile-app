-- =============================================================================
-- Migration: 002 — Extend Schema for Full E-Commerce Feature Set
-- Nile Ice Creams
-- Created: 2026-03-07
--
-- Rules:
--   • Fully additive — safe to run on top of migration 001.
--   • All changes use "if not exists" / "if column not exists" guards
--     so the migration is idempotent.
--   • New migration for every schema change (never edit applied migrations).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTEND: categories
--    Add display_order, image_url, is_active columns.
-- ---------------------------------------------------------------------------

alter table public.categories
    add column if not exists image_url    text,
    add column if not exists display_order integer not null default 0,
    add column if not exists is_active     boolean not null default true;

-- ---------------------------------------------------------------------------
-- 2. EXTEND: products
--    Add is_popular, is_available (alias for is_active), display_order.
--    Keep is_active for backwards-compat.
-- ---------------------------------------------------------------------------

alter table public.products
    add column if not exists is_popular    boolean not null default false,
    add column if not exists is_available  boolean not null default true,
    add column if not exists display_order integer not null default 0;

-- ---------------------------------------------------------------------------
-- 3. NEW TABLE: item_options
--    Stores per-product variants: size, toppings, cone_type, etc.
-- ---------------------------------------------------------------------------

create table if not exists public.item_options (
    id          uuid primary key default gen_random_uuid(),
    product_id  uuid not null references public.products(id) on delete cascade,
    option_type text not null,          -- e.g. 'size', 'topping', 'cone_type'
    label       text not null,          -- e.g. 'Large', 'Chocolate Chips'
    price_delta numeric(10,2) not null default 0,  -- price adjustment on top of base
    is_default  boolean not null default false,
    display_order integer not null default 0,
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

create index if not exists idx_item_options_product_id
    on public.item_options(product_id);

create index if not exists idx_item_options_type
    on public.item_options(product_id, option_type);

-- ---------------------------------------------------------------------------
-- 4. NEW TABLE: carts
--    One active cart per session/user. Guests identified by session_id.
-- ---------------------------------------------------------------------------

create table if not exists public.carts (
    id          uuid primary key default gen_random_uuid(),
    profile_id  uuid references public.profiles(id) on delete cascade,
    session_id  text,          -- for guest users (browser-generated UUID)
    created_at  timestamptz default now(),
    updated_at  timestamptz default now(),
    -- A cart belongs to either a profile OR a session, not both null
    constraint carts_owner_check check (
        profile_id is not null or session_id is not null
    )
);

create index if not exists idx_carts_profile_id  on public.carts(profile_id);
create index if not exists idx_carts_session_id  on public.carts(session_id);

-- ---------------------------------------------------------------------------
-- 5. NEW TABLE: cart_items
--    Line items inside a cart. Stores chosen options as JSONB for flexibility.
-- ---------------------------------------------------------------------------

create table if not exists public.cart_items (
    id             uuid primary key default gen_random_uuid(),
    cart_id        uuid not null references public.carts(id) on delete cascade,
    product_id     uuid not null references public.products(id) on delete cascade,
    quantity       integer not null default 1 check (quantity > 0),
    unit_price     numeric(10,2) not null,   -- price at time of adding to cart
    selected_options jsonb default '[]'::jsonb, -- [{option_id, label, price_delta}]
    created_at     timestamptz default now(),
    updated_at     timestamptz default now()
);

create index if not exists idx_cart_items_cart_id    on public.cart_items(cart_id);
create index if not exists idx_cart_items_product_id on public.cart_items(product_id);

-- ---------------------------------------------------------------------------
-- 6. INDEXES on existing tables (safe, idempotent)
-- ---------------------------------------------------------------------------

create index if not exists idx_products_category_id  on public.products(category_id);
create index if not exists idx_products_is_active     on public.products(is_active);
create index if not exists idx_products_is_popular    on public.products(is_popular);
create index if not exists idx_order_items_order_id   on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_orders_profile_id      on public.orders(profile_id);

-- ---------------------------------------------------------------------------
-- 7. UPDATED_AT TRIGGERS for new tables
-- ---------------------------------------------------------------------------

create trigger update_item_options_updated_at
before update on public.item_options
for each row execute procedure public.handle_updated_at();

create trigger update_carts_updated_at
before update on public.carts
for each row execute procedure public.handle_updated_at();

create trigger update_cart_items_updated_at
before update on public.cart_items
for each row execute procedure public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY — new tables
-- ---------------------------------------------------------------------------

alter table public.item_options enable row level security;
alter table public.carts        enable row level security;
alter table public.cart_items   enable row level security;

-- item_options: public read (same as products)
create policy "public read item_options"
on public.item_options for select
using (true);

-- Admins can manage item_options
create policy "admin manage item_options"
on public.item_options for all
using (public.is_admin())
with check (public.is_admin());

-- Carts: users manage their own cart
create policy "users manage own cart"
on public.carts for all
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- Guest carts accessible via session_id (app-enforced; no auth.uid() check)
create policy "guest access cart by session"
on public.carts for all
using (profile_id is null);

-- Cart items: scoped through cart ownership
create policy "users manage own cart items"
on public.cart_items for all
using (
    cart_id in (
        select id from public.carts where profile_id = auth.uid()
    )
)
with check (
    cart_id in (
        select id from public.carts where profile_id = auth.uid()
    )
);

create policy "guest access cart items by session"
on public.cart_items for all
using (
    cart_id in (
        select id from public.carts where profile_id is null
    )
);

-- Admins can read all orders and order items
create policy "admin read all orders"
on public.orders for select
using (public.is_admin());

create policy "admin read all order items"
on public.order_items for select
using (public.is_admin());

create policy "admin manage order items"
on public.order_items for all
using (public.is_admin())
with check (public.is_admin());
