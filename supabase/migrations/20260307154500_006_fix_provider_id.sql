-- Migration 006: Fix provider_id constraint in bypass signup helper

create or replace function public.register_dummy_user(
    p_email text,
    p_password text,
    p_phone text
) returns uuid
language plpgsql
security definer
as $$
declare
    v_user_id uuid;
    v_encrypted_pw text;
begin
    -- Check if user already exists
    select id into v_user_id from auth.users where email = p_email;
    
    if v_user_id is not null then
        return v_user_id; -- User already exists
    end if;

    -- Generate a new UUID
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Insert into auth.users manually
    insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) values (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        p_email,
        v_encrypted_pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', p_phone, 'phone', p_phone),
        now(),
        now()
    );

    -- Insert into auth.identities
    insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) values (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        p_email, -- FIX: provider_id is required
        now(),
        now(),
        now()
    );

    return v_user_id;
end;
$$;
