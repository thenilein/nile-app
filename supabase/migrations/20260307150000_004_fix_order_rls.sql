-- Fix: Allow guest orders (profile_id IS NULL) and add missing order_items insert policy
-- The original policy only allows: auth.uid() = profile_id
-- This fails for guest users where profile_id is null, and for order_items which had no insert policy.

-- Drop the restrictive original insert policy
drop policy if exists "users create orders" on public.orders;

-- New policy: allow logged-in users to create orders tied to their profile
drop policy if exists "users create own orders" on public.orders;
create policy "users create own orders"
on public.orders
for insert
with check (
    (auth.uid() IS NOT NULL AND auth.uid() = profile_id)
);

-- New policy: allow guest orders (profile_id IS NULL, unauthenticated users)
drop policy if exists "guests create anonymous orders" on public.orders;
create policy "guests create anonymous orders"
on public.orders
for insert
with check (profile_id IS NULL);

-- Allow users to view their own orders OR guest orders (no profile_id)
drop policy if exists "users view own orders" on public.orders;
create policy "users view own orders"
on public.orders
for select
using (
    auth.uid() = profile_id
    OR (auth.uid() IS NULL AND profile_id IS NULL)
);

-- Allow admin to do everything on orders
drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders"
on public.orders
for all
using (public.is_admin())
with check (public.is_admin());

-- ── order_items: add missing insert + select policies ──

-- Allow insert for any order (guests + authenticated)
drop policy if exists "allow insert order_items" on public.order_items;
create policy "allow insert order_items"
on public.order_items
for insert
with check (
    exists (
        select 1 from public.orders
        where id = order_id
    )
);

-- Allow select for own order items
drop policy if exists "users view own order items" on public.order_items;
create policy "users view own order items"
on public.order_items
for select
using (
    exists (
        select 1 from public.orders
        where id = order_id
          and (auth.uid() = profile_id OR profile_id IS NULL)
    )
);

-- Admins can manage all order items
drop policy if exists "admins manage order_items" on public.order_items;
create policy "admins manage order_items"
on public.order_items
for all
using (public.is_admin())
with check (public.is_admin());
