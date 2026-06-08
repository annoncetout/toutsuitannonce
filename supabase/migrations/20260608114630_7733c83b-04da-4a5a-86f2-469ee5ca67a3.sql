
-- 1. Remove anon SELECT on profiles base table (PII exposure). profiles_public view remains for anon reads.
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

-- 2. Tighten public listings policy: only approved & non-quarantined listings exposed to anon/auth.
DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
CREATE POLICY "Public can view active listings"
  ON public.listings FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND moderation_status = 'approved'::listing_status
    AND quarantined_at IS NULL
    AND auto_removed IS NOT TRUE
  );

-- 3. Public SELECT on listing-photos storage objects (bucket is public; listings page needs anon read).
DROP POLICY IF EXISTS "Public can view listing photos" ON storage.objects;
CREATE POLICY "Public can view listing photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'listing-photos');

-- 4. Pin search_path on remaining queue helper functions.
ALTER FUNCTION public.enqueue_email(text, jsonb)      SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint)      SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
