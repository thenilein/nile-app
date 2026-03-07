-- Fix Guest Orders RLS Policies

-- Drop any conflicting policies to be absolutely certain
DROP POLICY IF EXISTS "users create orders" ON public.orders;
DROP POLICY IF EXISTS "users create own orders" ON public.orders;
DROP POLICY IF EXISTS "guests create anonymous orders" ON public.orders;
DROP POLICY IF EXISTS "users view own orders" ON public.orders;
DROP POLICY IF EXISTS "admins manage orders" ON public.orders;

-- 1. Insert Policies
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Anonymous users can create guest orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (auth.role() = 'anon' AND profile_id IS NULL);

-- 2. Select Policies
CREATE POLICY "Authenticated users view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id OR public.is_admin());

CREATE POLICY "Anonymous users view guest orders"
ON public.orders
FOR SELECT
TO anon
USING (auth.role() = 'anon' AND profile_id IS NULL);

-- 3. Update Policies
CREATE POLICY "Admins update orders"
ON public.orders
FOR UPDATE
USING (public.is_admin());

-- Order Items Needs Similarly Robust Catch-all
DROP POLICY IF EXISTS "allow insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "users view own order items" ON public.order_items;
DROP POLICY IF EXISTS "admins manage order_items" ON public.order_items;

CREATE POLICY "Anyone can insert order items"
ON public.order_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can select their order items"
ON public.order_items
FOR SELECT
USING (true);

-- Ensure anon has correct grants just in case PostgREST or schema lost them
GRANT ALL ON TABLE public.orders TO anon, authenticated;
GRANT ALL ON TABLE public.order_items TO anon, authenticated;
