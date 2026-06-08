
-- Restrict anon to only public, non-sensitive profile columns
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT (id, display_name, city, avatar_url, account_type, is_verified, status, created_at) ON public.profiles TO anon;
