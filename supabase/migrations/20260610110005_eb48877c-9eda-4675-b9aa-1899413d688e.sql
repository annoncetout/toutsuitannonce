
-- ============ ENUM ============
DO $$ BEGIN
  CREATE TYPE public.seller_badge AS ENUM ('none','gold','silver','bronze');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Additions to existing tables ============
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_clicks_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_top_seller_suspended boolean NOT NULL DEFAULT false;

-- ============ seller_stats ============
CREATE TABLE IF NOT EXISTS public.seller_stats (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  listings_count integer NOT NULL DEFAULT 0,
  active_listings_count integer NOT NULL DEFAULT 0,
  total_views integer NOT NULL DEFAULT 0,
  total_phone_clicks integer NOT NULL DEFAULT 0,
  total_messages integer NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  response_rate numeric(4,3) NOT NULL DEFAULT 0,
  avg_rating numeric(3,2) NOT NULL DEFAULT 0,
  positive_reviews_count integer NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  account_age_days integer NOT NULL DEFAULT 0,
  publish_frequency numeric(6,2) NOT NULL DEFAULT 0,
  quality_score numeric(4,3) NOT NULL DEFAULT 0,
  top_score numeric(6,2) NOT NULL DEFAULT 0,
  category_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  badge public.seller_badge NOT NULL DEFAULT 'none',
  rank_global integer,
  rank_category jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_top_of_month boolean NOT NULL DEFAULT false,
  fraud_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_suspended boolean NOT NULL DEFAULT false,
  suspension_reason text,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seller_stats TO anon, authenticated;
GRANT ALL ON public.seller_stats TO service_role;

ALTER TABLE public.seller_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view non-suspended seller stats"
ON public.seller_stats FOR SELECT
USING (is_suspended = false);

CREATE POLICY "Admins can view all seller stats"
ON public.seller_stats FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage seller stats"
ON public.seller_stats FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_seller_stats_topscore ON public.seller_stats (top_score DESC) WHERE is_suspended = false;
CREATE INDEX IF NOT EXISTS idx_seller_stats_badge ON public.seller_stats (badge) WHERE badge <> 'none';

CREATE TRIGGER seller_stats_updated_at
BEFORE UPDATE ON public.seller_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ seller_reviews ============
CREATE TABLE IF NOT EXISTS public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_verified boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, reviewer_id)
);

GRANT SELECT ON public.seller_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seller_reviews TO authenticated;
GRANT ALL ON public.seller_reviews TO service_role;

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view reviews"
ON public.seller_reviews FOR SELECT
USING (is_hidden = false);

CREATE POLICY "Admins can view all reviews"
ON public.seller_reviews FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can review a seller they messaged"
ON public.seller_reviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND reviewer_id <> seller_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
     WHERE (m.sender_id = auth.uid() AND m.recipient_id = seller_id)
        OR (m.sender_id = seller_id AND m.recipient_id = auth.uid())
  )
);

CREATE POLICY "Reviewers can update their own review"
ON public.seller_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can delete their own review"
ON public.seller_reviews FOR DELETE
TO authenticated
USING (auth.uid() = reviewer_id);

CREATE POLICY "Admins can manage reviews"
ON public.seller_reviews FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller ON public.seller_reviews (seller_id);

CREATE TRIGGER seller_reviews_updated_at
BEFORE UPDATE ON public.seller_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ listing_phone_clicks ============
CREATE TABLE IF NOT EXISTS public.listing_phone_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_hash text,
  channel text NOT NULL DEFAULT 'phone',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.listing_phone_clicks TO anon, authenticated;
GRANT SELECT, DELETE ON public.listing_phone_clicks TO authenticated;
GRANT ALL ON public.listing_phone_clicks TO service_role;

ALTER TABLE public.listing_phone_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a phone click"
ON public.listing_phone_clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view phone clicks"
ON public.listing_phone_clicks FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_listing_phone_clicks_listing ON public.listing_phone_clicks (listing_id, created_at DESC);

-- ============ RPC: increment phone click (dedup 1h per session) ============
CREATE OR REPLACE FUNCTION public.increment_listing_phone_click(
  _listing_id uuid,
  _session_hash text DEFAULT NULL,
  _channel text DEFAULT 'phone'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent boolean := false;
BEGIN
  IF _session_hash IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.listing_phone_clicks
      WHERE listing_id = _listing_id
        AND session_hash = _session_hash
        AND created_at > now() - interval '1 hour'
    ) INTO v_recent;
  END IF;

  IF v_recent THEN RETURN; END IF;

  INSERT INTO public.listing_phone_clicks (listing_id, user_id, session_hash, channel)
  VALUES (_listing_id, auth.uid(), _session_hash, COALESCE(_channel,'phone'));

  UPDATE public.listings
     SET phone_clicks_count = phone_clicks_count + 1
   WHERE id = _listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_phone_click(uuid, text, text) TO anon, authenticated;

-- ============ RPC: recompute one seller ============
CREATE OR REPLACE FUNCTION public.recompute_seller_score(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listings int := 0;
  v_active int := 0;
  v_views bigint := 0;
  v_phone bigint := 0;
  v_sales int := 0;
  v_msgs bigint := 0;
  v_replied bigint := 0;
  v_resp_rate numeric := 0;
  v_avg_rating numeric := 0;
  v_reviews int := 0;
  v_positive int := 0;
  v_age_days int := 0;
  v_freq numeric := 0;
  v_quality numeric := 0;
  v_sales_norm numeric := 0;
  v_views_norm numeric := 0;
  v_age_norm numeric := 0;
  v_rating_norm numeric := 0;
  v_top numeric := 0;
  v_cat_scores jsonb := '{}'::jsonb;
  v_created timestamptz;
BEGIN
  SELECT created_at INTO v_created FROM public.profiles WHERE id = _user_id;
  IF v_created IS NULL THEN RETURN; END IF;
  v_age_days := GREATEST(0, EXTRACT(DAY FROM (now() - v_created))::int);

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active = true AND moderation_status = 'approved'),
    COALESCE(SUM(views_count), 0),
    COALESCE(SUM(phone_clicks_count), 0),
    COUNT(*) FILTER (WHERE sold_at IS NOT NULL),
    AVG( CASE
      WHEN (CASE WHEN array_length(images,1) IS NULL THEN 0 ELSE LEAST(array_length(images,1),5) END)/5.0 * 0.4
         + CASE WHEN length(coalesce(description,'')) >= 120 THEN 0.4 ELSE length(coalesce(description,''))/300.0 END
         + CASE WHEN price IS NOT NULL AND price > 0 THEN 0.2 ELSE 0 END > 1 THEN 1
      ELSE (CASE WHEN array_length(images,1) IS NULL THEN 0 ELSE LEAST(array_length(images,1),5) END)/5.0 * 0.4
         + CASE WHEN length(coalesce(description,'')) >= 120 THEN 0.4 ELSE length(coalesce(description,''))/300.0 END
         + CASE WHEN price IS NOT NULL AND price > 0 THEN 0.2 ELSE 0 END
    END)
  INTO v_listings, v_active, v_views, v_phone, v_sales, v_quality
  FROM public.listings WHERE user_id = _user_id;

  v_quality := COALESCE(v_quality, 0);

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM public.messages m2
       WHERE m2.sender_id = m.recipient_id
         AND m2.recipient_id = m.sender_id
         AND m2.listing_id = m.listing_id
         AND m2.created_at > m.created_at
         AND m2.created_at < m.created_at + interval '7 days'
    ))
  INTO v_msgs, v_replied
  FROM public.messages m
  WHERE m.recipient_id = _user_id;

  v_resp_rate := CASE WHEN v_msgs > 0 THEN LEAST(1, v_replied::numeric / v_msgs) ELSE 0 END;

  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE rating >= 4)
  INTO v_avg_rating, v_reviews, v_positive
  FROM public.seller_reviews
  WHERE seller_id = _user_id AND is_hidden = false;

  -- publish frequency (annonces / mois sur 90j)
  SELECT COALESCE(COUNT(*) / 3.0, 0) INTO v_freq
  FROM public.listings
  WHERE user_id = _user_id AND created_at > now() - interval '90 days';

  -- Normalisations simples (bornes raisonnables)
  v_sales_norm  := LEAST(1, v_sales / 30.0);
  v_views_norm  := LEAST(1, v_views / 5000.0);
  v_age_norm    := LEAST(1, v_age_days / 365.0);
  v_rating_norm := COALESCE(v_avg_rating,0) / 5.0;

  v_top := ROUND(
    (30 * v_sales_norm)
    + (20 * v_rating_norm)
    + (15 * v_resp_rate)
    + (15 * v_views_norm)
    + (10 * v_age_norm)
    + (10 * v_quality)
  , 2);

  -- scores par catégorie (basé sur ventes + vues par catégorie, normalisé)
  WITH per_cat AS (
    SELECT c.slug,
           COUNT(*) FILTER (WHERE l.sold_at IS NOT NULL) AS s,
           COALESCE(SUM(l.views_count),0) AS v
      FROM public.listings l
      JOIN public.categories c ON c.id = l.category_id
     WHERE l.user_id = _user_id
     GROUP BY c.slug
  )
  SELECT COALESCE(jsonb_object_agg(slug, ROUND(LEAST(100, s*4 + v/50.0)::numeric, 2)), '{}'::jsonb)
    INTO v_cat_scores FROM per_cat;

  INSERT INTO public.seller_stats AS s (
    user_id, listings_count, active_listings_count, total_views, total_phone_clicks,
    total_messages, sales_count, response_rate, avg_rating, reviews_count,
    positive_reviews_count, account_age_days, publish_frequency, quality_score,
    top_score, category_scores, last_computed_at
  )
  VALUES (
    _user_id, v_listings, v_active, v_views, v_phone,
    v_msgs, v_sales, v_resp_rate, ROUND(COALESCE(v_avg_rating,0),2), v_reviews,
    v_positive, v_age_days, ROUND(v_freq,2), ROUND(v_quality,3),
    v_top, v_cat_scores, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    listings_count = EXCLUDED.listings_count,
    active_listings_count = EXCLUDED.active_listings_count,
    total_views = EXCLUDED.total_views,
    total_phone_clicks = EXCLUDED.total_phone_clicks,
    total_messages = EXCLUDED.total_messages,
    sales_count = EXCLUDED.sales_count,
    response_rate = EXCLUDED.response_rate,
    avg_rating = EXCLUDED.avg_rating,
    reviews_count = EXCLUDED.reviews_count,
    positive_reviews_count = EXCLUDED.positive_reviews_count,
    account_age_days = EXCLUDED.account_age_days,
    publish_frequency = EXCLUDED.publish_frequency,
    quality_score = EXCLUDED.quality_score,
    top_score = EXCLUDED.top_score,
    category_scores = EXCLUDED.category_scores,
    last_computed_at = now(),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_seller_score(uuid) TO authenticated, service_role;

-- ============ Recompute all + assign badges ============
CREATE OR REPLACE FUNCTION public.recompute_all_seller_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id FROM public.listings
  LOOP
    PERFORM public.recompute_seller_score(r.user_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_all_seller_scores() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_top_seller_badges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- reset
  UPDATE public.seller_stats SET badge = 'none', rank_global = NULL;

  WITH ranked AS (
    SELECT s.user_id,
           ROW_NUMBER() OVER (ORDER BY s.top_score DESC, s.sales_count DESC) AS rnk
      FROM public.seller_stats s
      JOIN public.profiles p ON p.id = s.user_id
     WHERE s.is_suspended = false
       AND p.is_top_seller_suspended = false
       AND p.status = 'active'
       AND s.active_listings_count > 0
  )
  UPDATE public.seller_stats t
     SET rank_global = r.rnk,
         badge = CASE
           WHEN r.rnk = 1 THEN 'gold'::seller_badge
           WHEN r.rnk BETWEEN 2 AND 3 THEN 'silver'::seller_badge
           WHEN r.rnk BETWEEN 4 AND 10 THEN 'bronze'::seller_badge
           ELSE 'none'::seller_badge
         END
    FROM ranked r
   WHERE t.user_id = r.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_top_seller_badges() TO authenticated, service_role;
