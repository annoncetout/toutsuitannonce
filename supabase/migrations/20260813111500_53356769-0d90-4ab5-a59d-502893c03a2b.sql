-- 1. parcel_listings: remove public access to full rows (contains sender/recipient PII)
DROP POLICY IF EXISTS "Public can view active parcel listings" ON public.parcel_listings;

CREATE OR REPLACE VIEW public.parcel_listings_public AS
SELECT
  id, user_id, type,
  departure_country, departure_city,
  arrival_country, arrival_city,
  departure_date, parcel_type, description,
  weight, length, width, height,
  declared_value, delivery_mode,
  price, currency, status, views_count,
  created_at, updated_at
FROM public.parcel_listings
WHERE status IN ('active'::parcel_status, 'matched'::parcel_status);

ALTER VIEW public.parcel_listings_public SET (security_invoker = off);
GRANT SELECT ON public.parcel_listings_public TO anon, authenticated;

-- 2. transporters: hide phone / whatsapp / documents from the public
DROP POLICY IF EXISTS "Public can view active transporters" ON public.transporters;

CREATE OR REPLACE VIEW public.transporters_public AS
SELECT
  id, user_id, display_name, photo, bio, city,
  verified, vehicle_type, max_weight, rating, total_trips,
  created_at, updated_at
FROM public.transporters
WHERE is_suspended = false;

ALTER VIEW public.transporters_public SET (security_invoker = off);
GRANT SELECT ON public.transporters_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_transporter_contact(_transporter_id uuid)
RETURNS TABLE(id uuid, display_name text, phone text, whatsapp text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.display_name, t.phone, t.whatsapp
  FROM public.transporters t
  WHERE t.id = _transporter_id
    AND t.is_suspended = false
    AND auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.get_transporter_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_transporter_contact(uuid) TO authenticated, service_role;

-- 3. seller_stats: public must go through the public view only
DROP POLICY IF EXISTS "Public can view non-suspended seller stats" ON public.seller_stats;
ALTER VIEW public.seller_stats_public SET (security_invoker = off);
GRANT SELECT ON public.seller_stats_public TO anon, authenticated;