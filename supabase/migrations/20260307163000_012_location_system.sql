-- Create Outlets Table if not exists
CREATE TABLE IF NOT EXISTS public.outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Outlets
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Outlets are readable by everyone" ON public.outlets;
CREATE POLICY "Outlets are readable by everyone" ON public.outlets FOR SELECT USING (true);

-- Insert Default Outlets if not exist
INSERT INTO public.outlets (name, latitude, longitude, city, state)
SELECT * FROM (VALUES
    ('Perambalur', 11.2333, 78.8667, 'Perambalur', 'Tamil Nadu'),
    ('Trichy', 10.8050, 78.6856, 'Tiruchirappalli', 'Tamil Nadu'),
    ('Salem', 11.6643, 78.1460, 'Salem', 'Tamil Nadu'),
    ('Chennai', 13.0827, 80.2707, 'Chennai', 'Tamil Nadu')
) AS v(name, latitude, longitude, city, state)
WHERE NOT EXISTS (SELECT 1 FROM public.outlets WHERE name = v.name);

-- Modify Existing Addresses Table
ALTER TABLE public.addresses 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS district TEXT,
    ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Make existing not nulls nullable so we dont break new inserts
ALTER TABLE public.addresses ALTER COLUMN street DROP NOT NULL;
ALTER TABLE public.addresses ALTER COLUMN locality DROP NOT NULL;

-- RLS for Addresses
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can read their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

CREATE POLICY "Users can insert their own addresses" ON public.addresses FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = profile_id OR user_id IS NULL OR profile_id IS NULL
);

CREATE POLICY "Users can read their own addresses" ON public.addresses FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = profile_id
);

CREATE POLICY "Users can update their own addresses" ON public.addresses FOR UPDATE USING (
    auth.uid() = user_id OR auth.uid() = profile_id
);

CREATE POLICY "Users can delete their own addresses" ON public.addresses FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = profile_id
);

UPDATE public.outlets
SET 
latitude = 11.239162958428368,
longitude = 78.8653029673088,
address = 'Nile Ice Cream Shop',
city = 'Perambalur',
state = 'Tamil Nadu'
WHERE name = 'Perambalur';

CREATE OR REPLACE FUNCTION public.find_nearest_outlet(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION
)
RETURNS TABLE(
    outlet_id UUID,
    name TEXT,
    city TEXT,
    distance_km DOUBLE PRECISION,
    is_serviceable BOOLEAN
)
LANGUAGE SQL
AS $$
SELECT
    o.id,
    o.name,
    o.city,
    (
        6371 * acos(
            cos(radians(user_lat)) *
            cos(radians(o.latitude)) *
            cos(radians(o.longitude) - radians(user_lng)) +
            sin(radians(user_lat)) *
            sin(radians(o.latitude))
        )
    ) AS distance_km,
    (
        (
            6371 * acos(
                cos(radians(user_lat)) *
                cos(radians(o.latitude)) *
                cos(radians(o.longitude) - radians(user_lng)) +
                sin(radians(user_lat)) *
                sin(radians(o.latitude))
            )
        ) <= 7
    ) AS is_serviceable
FROM public.outlets o
WHERE o.is_active = true
ORDER BY distance_km
LIMIT 1;
$$;