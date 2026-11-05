-- Revoke direct execution on trigger functions from anon and authenticated
-- These are internal trigger functions, not meant to be called via REST API
REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
