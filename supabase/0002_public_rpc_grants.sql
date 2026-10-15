-- Run this once in the Supabase SQL Editor after syncing the public player pages.
-- Public forms call narrowly-scoped SECURITY DEFINER RPC functions. Do not grant
-- direct anonymous SELECT access to registrations or donations.

grant execute on function public.register_player(text, text, text, text, text) to anon, authenticated;
grant execute on function public.lookup_registration(text, text) to anon, authenticated;
grant execute on function public.submit_donation(text, integer, text, text, boolean) to anon, authenticated;
