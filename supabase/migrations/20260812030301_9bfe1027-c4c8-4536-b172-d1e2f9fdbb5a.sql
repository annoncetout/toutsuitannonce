-- 1) seller_stats_public: switch to security invoker + scoped access on base table
ALTER VIEW public.seller_stats_public SET (security_invoker = on);

DROP POLICY IF EXISTS "Public can view non-suspended seller stats" ON public.seller_stats;
CREATE POLICY "Public can view non-suspended seller stats"
ON public.seller_stats
FOR SELECT
TO anon, authenticated
USING (is_suspended = false);

REVOKE SELECT ON public.seller_stats FROM anon, authenticated;
GRANT SELECT (
  user_id, display_name, avatar_url, city, listings_count, active_listings_count,
  total_views, sales_count, response_rate, avg_rating, reviews_count,
  positive_reviews_count, account_age_days, publish_frequency, quality_score,
  top_score, category_scores, badge, rank_global, rank_category, is_top_of_month,
  last_computed_at, is_suspended
) ON public.seller_stats TO anon, authenticated;
GRANT ALL ON public.seller_stats TO service_role;
GRANT SELECT ON public.seller_stats_public TO anon, authenticated;

-- 2) parcel_photos: scope public reads to publicly visible parcels or the owner
DROP POLICY IF EXISTS "Public can view parcel photos" ON public.parcel_photos;
CREATE POLICY "Parcel photos visible for public parcels or owner"
ON public.parcel_photos
FOR SELECT
TO anon, authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.parcel_listings pl
    WHERE pl.id = parcel_photos.parcel_id
      AND pl.status IN ('active'::parcel_status, 'matched'::parcel_status)
  )
);