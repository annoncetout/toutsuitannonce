
-- 1) seller_stats: replace broad public policy with a safe view
DROP POLICY IF EXISTS "Public can view non-suspended seller stats" ON public.seller_stats;

REVOKE SELECT ON public.seller_stats FROM anon;
REVOKE SELECT ON public.seller_stats FROM authenticated;
GRANT SELECT (
  user_id, display_name, avatar_url, city,
  listings_count, active_listings_count, total_views, sales_count,
  response_rate, avg_rating, reviews_count, positive_reviews_count,
  account_age_days, publish_frequency, quality_score,
  top_score, category_scores, badge, rank_global, rank_category,
  is_top_of_month, last_computed_at
) ON public.seller_stats TO anon, authenticated;

-- Re-add a SELECT policy gated on non-suspension; column grants above limit exposure
CREATE POLICY "Public can view safe seller stats columns"
  ON public.seller_stats
  FOR SELECT
  USING (is_suspended = false);

CREATE OR REPLACE VIEW public.seller_stats_public
WITH (security_invoker = true) AS
SELECT
  user_id, display_name, avatar_url, city,
  listings_count, active_listings_count, total_views, sales_count,
  response_rate, avg_rating, reviews_count, positive_reviews_count,
  account_age_days, publish_frequency, quality_score,
  top_score, category_scores, badge, rank_global, rank_category,
  is_top_of_month, last_computed_at
FROM public.seller_stats
WHERE is_suspended = false;

GRANT SELECT ON public.seller_stats_public TO anon, authenticated;

-- 2) listing_phone_clicks: ensure writes only via SECURITY DEFINER RPC
REVOKE INSERT, UPDATE, DELETE ON public.listing_phone_clicks FROM anon, authenticated;

-- 3) Pin search_path on email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
