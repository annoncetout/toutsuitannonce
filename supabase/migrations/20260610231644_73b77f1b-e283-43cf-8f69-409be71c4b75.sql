
-- 1. listing_phone_clicks: drop unrestricted INSERT (RPC handles it via SECURITY DEFINER)
DROP POLICY IF EXISTS "Anyone can record a phone click" ON public.listing_phone_clicks;

-- 2. profiles: restrict direct SELECT to owner + admins
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Make public view SECURITY DEFINER so anon/authenticated can read non-PII fields
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT id, display_name, avatar_url, city, account_type, is_verified, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Secure RPC to fetch seller contact only when the listing is publicly visible
CREATE OR REPLACE FUNCTION public.get_listing_seller_contact(_listing_id uuid)
RETURNS TABLE(
  id uuid,
  display_name text,
  phone text,
  whatsapp text,
  city text,
  is_verified boolean,
  account_type account_type
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.phone, p.whatsapp, p.city, p.is_verified, p.account_type
    FROM public.listings l
    JOIN public.profiles p ON p.id = l.user_id
   WHERE l.id = _listing_id
     AND l.is_active = true
     AND l.moderation_status = 'approved'
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_listing_seller_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_seller_contact(uuid) TO authenticated, anon;

-- Batch variant for cart checkout
CREATE OR REPLACE FUNCTION public.get_listings_seller_contacts(_listing_ids uuid[])
RETURNS TABLE(
  listing_id uuid,
  seller_id uuid,
  display_name text,
  phone text,
  whatsapp text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, p.id, p.display_name, p.phone, p.whatsapp
    FROM public.listings l
    JOIN public.profiles p ON p.id = l.user_id
   WHERE l.id = ANY(_listing_ids)
     AND l.is_active = true
     AND l.moderation_status = 'approved';
$$;

REVOKE ALL ON FUNCTION public.get_listings_seller_contacts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listings_seller_contacts(uuid[]) TO authenticated;

-- 3. seller_score_history: restrict raw access, expose safe view publicly
DROP POLICY IF EXISTS "Public read history" ON public.seller_score_history;

CREATE POLICY "Owners can read own history"
  ON public.seller_score_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP VIEW IF EXISTS public.seller_score_history_public;
CREATE VIEW public.seller_score_history_public
WITH (security_invoker = off) AS
SELECT id, user_id, top_score, previous_score, delta,
       sales_count, total_views, reviews_count, avg_rating, response_rate, computed_at
FROM public.seller_score_history;

GRANT SELECT ON public.seller_score_history_public TO anon, authenticated;
