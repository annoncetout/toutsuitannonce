
DROP POLICY IF EXISTS "Public profile basics viewable by anon" ON public.profiles;

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, display_name, avatar_url, city, account_type, is_verified, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
