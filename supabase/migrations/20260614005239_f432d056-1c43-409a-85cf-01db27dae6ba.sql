
-- 1) Block direct public/authenticated SELECT of seller_stats sensitive columns.
--    Only admins keep direct table read access. Public reads must go through
--    the safe seller_stats_public view.
DROP POLICY IF EXISTS "Public can view safe seller stats columns" ON public.seller_stats;

-- Recreate seller_stats_public as a SECURITY DEFINER view so it bypasses
-- the table-level admin-only RLS and only exposes the safe columns.
DROP VIEW IF EXISTS public.seller_stats_public;
CREATE VIEW public.seller_stats_public
WITH (security_invoker = false) AS
SELECT
  user_id, display_name, avatar_url, city,
  listings_count, active_listings_count, total_views, sales_count,
  response_rate, avg_rating, reviews_count, positive_reviews_count,
  account_age_days, publish_frequency, quality_score, top_score,
  category_scores, badge, rank_global, rank_category, is_top_of_month,
  last_computed_at
FROM public.seller_stats
WHERE is_suspended = false;

REVOKE ALL ON public.seller_stats_public FROM PUBLIC;
GRANT SELECT ON public.seller_stats_public TO anon, authenticated;
GRANT ALL ON public.seller_stats_public TO service_role;
