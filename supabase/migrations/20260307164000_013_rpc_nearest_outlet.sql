-- Drop the function first to allow changing the return type
DROP FUNCTION IF EXISTS public.find_nearest_outlet(DOUBLE PRECISION, DOUBLE PRECISION);

-- Create or Replace function to find nearest outlet and return distance & serviceable status
CREATE OR REPLACE FUNCTION public.find_nearest_outlet(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION)
RETURNS TABLE (
    id UUID,
    name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    city TEXT,
    state TEXT,
    is_active BOOLEAN,
    distance_km DOUBLE PRECISION,
    is_serviceable BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.latitude,
        o.longitude,
        o.address,
        o.city,
        o.state,
        o.is_active,
        -- Haversine formula
        (6371 * acos(
            cos(radians(user_lat)) *
            cos(radians(o.latitude)) *
            cos(radians(o.longitude) - radians(user_lng)) +
            sin(radians(user_lat)) *
            sin(radians(o.latitude))
        )) AS distance_km,
        -- Check if within 7km
        (6371 * acos(
            cos(radians(user_lat)) *
            cos(radians(o.latitude)) *
            cos(radians(o.longitude) - radians(user_lng)) +
            sin(radians(user_lat)) *
            sin(radians(o.latitude))
        )) <= 7 AS is_serviceable
    FROM 
        public.outlets o
    WHERE 
        o.is_active = true
    ORDER BY 
        distance_km ASC
    LIMIT 1;
END;
$$;

-- Grant execute access to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.find_nearest_outlet(DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;
