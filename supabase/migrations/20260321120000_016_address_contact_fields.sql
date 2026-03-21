-- Recipient, phone, and label for saved addresses
ALTER TABLE public.addresses
    ADD COLUMN IF NOT EXISTS recipient_name text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS address_type text;

-- Optional check: home | work | other (null allowed for legacy rows)
ALTER TABLE public.addresses
    DROP CONSTRAINT IF EXISTS addresses_address_type_check;

ALTER TABLE public.addresses
    ADD CONSTRAINT addresses_address_type_check
    CHECK (address_type IS NULL OR address_type IN ('home', 'work', 'other'));
