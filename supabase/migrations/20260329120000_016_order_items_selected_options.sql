-- Persist chosen modifiers on each order line (mirrors cart_items.selected_options).

alter table public.order_items
    add column if not exists selected_options jsonb not null default '[]'::jsonb;

comment on column public.order_items.selected_options is
    'Chosen item_options at checkout: [{id, option_type, label, price_delta}]';
