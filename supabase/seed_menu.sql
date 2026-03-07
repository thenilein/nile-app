-- =============================================================================
-- Seeder: seed_menu.sql
-- Nile Ice Creams — Sample menu data for development
--
-- Usage: Run manually against your local Supabase instance
--   supabase db reset  (applies all migrations + seeds)
--   OR: paste into the Supabase SQL editor
--
-- Design:
--   • Idempotent — uses INSERT ... ON CONFLICT DO NOTHING on slug/name
--   • Uses fixed UUIDs so re-running is safe
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------

insert into public.categories (id, name, slug, description, display_order, is_active)
values
    ('11111111-0000-4000-a000-000000000001', 'Classic Scoops',    'classic-scoops',    'Timeless favourites served in your choice of cup or cone',       1, true),
    ('11111111-0000-4000-a000-000000000002', 'Sundaes',           'sundaes',           'Rich ice cream sundaes loaded with toppings and sauces',         2, true),
    ('11111111-0000-4000-a000-000000000003', 'Milkshakes',        'milkshakes',        'Thick and creamy hand-spun milkshakes',                          3, true),
    ('11111111-0000-4000-a000-000000000004', 'Waffles & Crepes',  'waffles-crepes',    'Warm waffles and crepes paired with our house ice cream',        4, true),
    ('11111111-0000-4000-a000-000000000005', 'Seasonal Specials', 'seasonal-specials', 'Limited-edition flavours crafted for the season',                5, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------------

insert into public.products (id, category_id, name, description, price, is_active, is_available, is_popular, display_order)
values
    -- Classic Scoops
    ('22222222-0000-4000-a000-000000000001', '11111111-0000-4000-a000-000000000001',
     'Vanilla Dream',        'Pure Madagascar vanilla bean ice cream — creamy, simple, perfect.',                     80.00,  true, true, true,  1),

    ('22222222-0000-4000-a000-000000000002', '11111111-0000-4000-a000-000000000001',
     'Belgian Chocolate',   'Dark Belgian chocolate ice cream with a velvety finish.',                               90.00,  true, true, true,  2),

    ('22222222-0000-4000-a000-000000000003', '11111111-0000-4000-a000-000000000001',
     'Tender Coconut',      'Fresh tender coconut ice cream — a South Indian favourite.',                            85.00,  true, true, false, 3),

    ('22222222-0000-4000-a000-000000000004', '11111111-0000-4000-a000-000000000001',
     'Mango Alphonso',      'Made with real Alphonso mango pulp. Available seasonally.',                             95.00,  true, true, true,  4),

    ('22222222-0000-4000-a000-000000000005', '11111111-0000-4000-a000-000000000001',
     'Rose Falooda',         'Fragrant rose-flavoured ice cream with basil seeds and falooda.',                      100.00, true, true, false, 5),

    ('22222222-0000-4000-a000-000000000006', '11111111-0000-4000-a000-000000000001',
     'Pista Royale',         'Pistachio ice cream studded with whole pistachios.',                                   110.00, true, true, false, 6),

    -- Sundaes
    ('22222222-0000-4000-a000-000000000007', '11111111-0000-4000-a000-000000000002',
     'Hot Fudge Sundae',    '3 scoops of vanilla with warm fudge sauce, whipped cream & a cherry.',                 160.00, true, true, true,  1),

    ('22222222-0000-4000-a000-000000000008', '11111111-0000-4000-a000-000000000002',
     'Brownie Bliss',       'Warm chocolate brownie topped with 2 scoops and caramel drizzle.',                     180.00, true, true, true,  2),

    ('22222222-0000-4000-a000-000000000009', '11111111-0000-4000-a000-000000000002',
     'Mango Tango Sundae',  'Mango sorbet, Alphonso ice cream, fresh mango cubes and mint.',                        170.00, true, true, false, 3),

    -- Milkshakes
    ('22222222-0000-4000-a000-000000000010', '11111111-0000-4000-a000-000000000003',
     'Classic Vanilla Shake',  'Thick hand-spun vanilla milkshake topped with whipped cream.',                      120.00, true, true, true,  1),

    ('22222222-0000-4000-a000-000000000011', '11111111-0000-4000-a000-000000000003',
     'Dark Chocolate Shake',   'Intensely chocolatey milkshake made with Belgian chocolate ice cream.',             130.00, true, true, true,  2),

    ('22222222-0000-4000-a000-000000000012', '11111111-0000-4000-a000-000000000003',
     'Strawberry Fields Shake', 'Fresh strawberry milkshake — naturally pink, naturally delicious.',                125.00, true, true, false, 3),

    -- Waffles & Crepes
    ('22222222-0000-4000-a000-000000000013', '11111111-0000-4000-a000-000000000004',
     'Belgian Waffle Scoop',   '1 crispy Belgian waffle with 2 scoops and chocolate sauce.',                        200.00, true, true, true,  1),

    ('22222222-0000-4000-a000-000000000014', '11111111-0000-4000-a000-000000000004',
     'Nutella Crepe Delight',  'Thin crepe filled with Nutella, topped with 1 scoop and banana.',                   190.00, true, true, false, 2),

    -- Seasonal Specials
    ('22222222-0000-4000-a000-000000000015', '11111111-0000-4000-a000-000000000005',
     'Jackfruit Surprise',     'Seasonal jackfruit ice cream with jaggery caramel — limited batch.',                120.00, true, true, true,  1),

    ('22222222-0000-4000-a000-000000000016', '11111111-0000-4000-a000-000000000005',
     'Tamarind Sorbet',        'Tangy tamarind sorbet with black salt — a bold South Indian twist.',                90.00,  true, true, false, 2)

on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ITEM OPTIONS
-- Size variants for Classic Scoops
-- ---------------------------------------------------------------------------

insert into public.item_options (product_id, option_type, label, price_delta, is_default, display_order)
select p.id, 'size', 'Single Scoop', 0.00,   true,  1 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000001'
union all
select p.id, 'size', 'Double Scoop', 40.00,  false, 2 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000001'
union all
select p.id, 'size', 'Triple Scoop', 75.00,  false, 3 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000001'
on conflict do nothing;

-- Cone type options for Classic Scoops
insert into public.item_options (product_id, option_type, label, price_delta, is_default, display_order)
select p.id, 'cone_type', 'Cup',          0.00, true,  1 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000001'
union all
select p.id, 'cone_type', 'Sugar Cone',   5.00, false, 2 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000001'
union all
select p.id, 'cone_type', 'Waffle Cone',  15.00, false, 3 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000001'
on conflict do nothing;

-- Topping options (applied to Sundaes)
insert into public.item_options (product_id, option_type, label, price_delta, is_default, display_order)
select p.id, 'topping', 'Chocolate Chips',  10.00, false, 1 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000002'
union all
select p.id, 'topping', 'Crushed Biscuits', 10.00, false, 2 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000002'
union all
select p.id, 'topping', 'Rainbow Sprinkles', 5.00, false, 3 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000002'
union all
select p.id, 'topping', 'Chopped Nuts',     15.00, false, 4 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000002'
on conflict do nothing;

-- Shake size options
insert into public.item_options (product_id, option_type, label, price_delta, is_default, display_order)
select p.id, 'size', 'Regular (300ml)', 0.00,  true,  1 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000003'
union all
select p.id, 'size', 'Large (500ml)',   30.00, false, 2 from public.products p where p.category_id = '11111111-0000-4000-a000-000000000003'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- SETTINGS (default store config)
-- ---------------------------------------------------------------------------

insert into public.settings (key, value, description)
values
    ('store_name',        '"Nile Ice Creams"',          'Public display name of the store'),
    ('store_open',        'true',                       'Whether the store is currently accepting orders'),
    ('delivery_fee',      '{"amount": 30, "free_above": 300}', 'Delivery fee config (amount in ₹, free above threshold)'),
    ('min_order_amount',  '100',                        'Minimum order value in ₹'),
    ('store_hours',       '{"open": "10:00", "close": "22:00"}', 'Store operating hours')
on conflict (key) do nothing;
