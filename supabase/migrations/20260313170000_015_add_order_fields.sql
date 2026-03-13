-- Migration: 015 — Add missing phone & delivery_address columns to orders
-- These columns are referenced in CheckoutDrawer.tsx but were never created.

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS phone            text,
    ADD COLUMN IF NOT EXISTS delivery_address jsonb;
