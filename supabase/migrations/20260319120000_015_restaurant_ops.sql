-- Migration 015: restaurant operations controls for staff app

alter table public.products
    add column if not exists availability_mode text not null default 'available'
        check (availability_mode in ('available', 'sold_out_today', 'sold_out_indefinitely', 'scheduled')),
    add column if not exists unavailable_reason text,
    add column if not exists available_from time,
    add column if not exists available_to time;

alter table public.item_options
    add column if not exists is_available boolean not null default true,
    add column if not exists availability_mode text not null default 'available'
        check (availability_mode in ('available', 'sold_out_today', 'sold_out_indefinitely', 'scheduled')),
    add column if not exists unavailable_reason text,
    add column if not exists available_from time,
    add column if not exists available_to time;

insert into public.settings (key, value, description) values
    ('pause_orders', 'false', 'Temporarily pause new incoming orders'),
    ('busy_mode', 'false', 'Enable busy mode for longer prep times'),
    ('busy_prep_minutes', '20', 'Prep time override used in busy mode')
on conflict (key) do nothing;
