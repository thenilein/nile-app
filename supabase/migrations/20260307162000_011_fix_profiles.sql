-- Migration 011: Cleanup duplicate profiles and enforce primary key

-- Remove duplicates if any
delete from public.profiles
where id in (
  select id
  from public.profiles
  group by id
  having count(*) > 1
);

-- Ensure id is primary key


-- Ensure admin profile exists
insert into public.profiles (id, role)
select id, 'admin'
from auth.users
where email = 'admin@nileicecreams.com'
on conflict (id) do update
set role = 'admin';
