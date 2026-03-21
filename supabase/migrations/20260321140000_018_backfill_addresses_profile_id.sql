-- Link existing rows that only had user_id set (app used to omit profile_id).
UPDATE public.addresses
SET profile_id = user_id
WHERE profile_id IS NULL
  AND user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = addresses.user_id);
