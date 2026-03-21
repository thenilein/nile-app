-- formatted_address: single human-readable line built in the app as:
--   [flat/house], [street], [Mapbox reverse place_name OR lat,lng fallback]
-- plus recipient_name, phone, address_type stored in their own columns.

COMMENT ON COLUMN public.addresses.formatted_address IS
    'Merged display line: user unit/street + reverse-geocoded area (Mapbox) or coordinates if geocode unavailable.';

-- Optional: faster lookups by user (already common pattern)
CREATE INDEX IF NOT EXISTS addresses_user_id_created_at_idx
    ON public.addresses (user_id, created_at DESC);
