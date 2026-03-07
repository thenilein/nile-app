-- Migration 009: Switch to JWT-based Role Strategy (Fix Infinite Recursion)

-- 1. Redefine is_admin() to check the secure JWT token instead of the profiles table.
-- This breaks the infinite loop because it doesn't query the database at all!
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
as $$
begin
  -- Supabase stores raw_app_meta_data inside 'app_metadata' in the JWT
  return coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
end;
$$;

-- 2. Create a function to keep auth.users.raw_app_meta_data in sync with public.profiles.role
create or replace function public.sync_profile_role_to_jwt()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Update the hidden auth.users table so the next time they get a JWT, 
  -- it has the new role explicitly embedded.
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$;

-- 3. Attach the trigger to the profiles table
drop trigger if exists sync_role_on_profile_update on public.profiles;
create trigger sync_role_on_profile_update
after update of role on public.profiles
for each row
when (old.role is distinct from new.role)
execute procedure public.sync_profile_role_to_jwt();

-- 4. Backfill existing profile roles into the auth.users table immediately
update auth.users au
set raw_app_meta_data = coalesce(au.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
from public.profiles p
where p.id = au.id;
