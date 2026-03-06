-- Nile Ice Creams Initial Schema

-- Enable required extension
create extension if not exists pgcrypto;

-------------------------------------------------------------------------------
-- TABLES
-------------------------------------------------------------------------------

-- PROFILES
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    avatar_url text,
    role text default 'user' check (role in ('user','admin')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- CATEGORIES
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- PRODUCTS
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    category_id uuid references public.categories(id) on delete set null,
    name text not null,
    description text,
    price numeric(10,2) not null default 0,
    image_url text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ADDRESSES
create table if not exists public.addresses (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references public.profiles(id) on delete cascade,
    street text not null,
    locality text not null,
    city text,
    state text,
    postal_code text,
    lat numeric(10,8),
    lng numeric(11,8),
    is_default boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ORDERS
create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references public.profiles(id) on delete cascade,
    address_id uuid references public.addresses(id) on delete set null,
    status text default 'pending',
    total_amount numeric(10,2) default 0,
    payment_status text default 'unpaid',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ORDER ITEMS
create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid references public.orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    quantity integer not null,
    price_at_purchase numeric(10,2) not null,
    created_at timestamptz default now()
);

-- ENQUIRIES
create table if not exists public.enquiries (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    message text not null,
    status text default 'new',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- SETTINGS
create table if not exists public.settings (
    key text primary key,
    value jsonb not null,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-------------------------------------------------------------------------------
-- AUTH TRIGGER (AUTO CREATE PROFILE)
-------------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-------------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-------------------------------------------------------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

create trigger update_categories_updated_at
before update on public.categories
for each row execute procedure public.handle_updated_at();

create trigger update_products_updated_at
before update on public.products
for each row execute procedure public.handle_updated_at();

create trigger update_orders_updated_at
before update on public.orders
for each row execute procedure public.handle_updated_at();

-------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.enquiries enable row level security;
alter table public.settings enable row level security;

-------------------------------------------------------------------------------
-- ADMIN CHECK FUNCTION
-------------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-------------------------------------------------------------------------------
-- BASIC POLICIES
-------------------------------------------------------------------------------

create policy "public read categories"
on public.categories
for select
using (true);

create policy "public read products"
on public.products
for select
using (true);

create policy "users view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "users update own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "users create orders"
on public.orders
for insert
with check (auth.uid() = profile_id);

create policy "users view own orders"
on public.orders
for select
using (auth.uid() = profile_id);