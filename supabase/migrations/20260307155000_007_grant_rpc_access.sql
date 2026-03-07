-- Migration 007: Grant execute on dummy user registration

-- Give access to the anon and authenticated roles so the frontend can call the RPC
grant execute on function public.register_dummy_user(text, text, text) to anon, authenticated;

-- Force a schema cache reload for PostgREST (sometimes needed for new RPCs to be recognized)
notify pgrst, 'reload schema';
