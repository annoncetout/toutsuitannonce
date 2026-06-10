
-- 1. Score history table
CREATE TABLE public.seller_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  top_score numeric NOT NULL,
  previous_score numeric,
  delta numeric,
  sales_count int,
  total_views bigint,
  total_phone_clicks bigint,
  reviews_count int,
  avg_rating numeric,
  response_rate numeric,
  quality_score numeric,
  account_age_days int,
  weights jsonb,
  reason text,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seller_score_history_user_time ON public.seller_score_history(user_id, computed_at DESC);

GRANT SELECT ON public.seller_score_history TO authenticated, anon;
GRANT ALL ON public.seller_score_history TO service_role;

ALTER TABLE public.seller_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read history" ON public.seller_score_history
  FOR SELECT USING (true);
CREATE POLICY "Admins manage history" ON public.seller_score_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Insert default weights settings
INSERT INTO public.site_settings (key, value)
VALUES ('top_score_weights', jsonb_build_object(
  'sales', 30,
  'rating', 20,
  'response', 15,
  'views', 15,
  'age', 10,
  'quality', 10,
  'sales_target', 30,
  'views_target', 5000,
  'age_target_days', 365
))
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('fraud_notify', jsonb_build_object(
  'enabled', true,
  'slack_webhook', '',
  'notify_emails', '[]'::jsonb
))
ON CONFLICT (key) DO NOTHING;

-- 3. Update recompute_seller_score to use configurable weights + log history
CREATE OR REPLACE FUNCTION public.recompute_seller_score(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_prev numeric := NULL;
  v_cat_scores jsonb := '{}'::jsonb;
  v_created timestamptz;
  v_dn text; v_av text; v_city text;
  v_w jsonb;
  w_sales numeric; w_rating numeric; w_response numeric;
  w_views numeric; w_age numeric; w_quality numeric;
  t_sales numeric; t_views numeric; t_age numeric;
BEGIN
  SELECT value INTO v_w FROM public.site_settings WHERE key = 'top_score_weights';
  w_sales    := COALESCE((v_w->>'sales')::numeric, 30);
  w_rating   := COALESCE((v_w->>'rating')::numeric, 20);
  w_response := COALESCE((v_w->>'response')::numeric, 15);
  w_views    := COALESCE((v_w->>'views')::numeric, 15);
  w_age      := COALESCE((v_w->>'age')::numeric, 10);
  w_quality  := COALESCE((v_w->>'quality')::numeric, 10);
  t_sales    := COALESCE((v_w->>'sales_target')::numeric, 30);
  t_views    := COALESCE((v_w->>'views_target')::numeric, 5000);
  t_age      := COALESCE((v_w->>'age_target_days')::numeric, 365);

  SELECT created_at, display_name, avatar_url, city
    INTO v_created, v_dn, v_av, v_city
    FROM public.profiles WHERE id = _user_id;
  IF v_created IS NULL THEN RETURN; END IF;
  v_age_days := GREATEST(0, EXTRACT(DAY FROM (now() - v_created))::int);

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active = true AND moderation_status = 'approved'),
    COALESCE(SUM(views_count), 0),
    COALESCE(SUM(phone_clicks_count), 0),
    COUNT(*) FILTER (WHERE sold_at IS NOT NULL),
    AVG(
      (CASE WHEN array_length(images,1) IS NULL THEN 0 ELSE LEAST(array_length(images,1),5) END)/5.0 * 0.4
      + LEAST(0.4, length(coalesce(description,''))/300.0)
      + CASE WHEN price IS NOT NULL AND price > 0 THEN 0.2 ELSE 0 END
    )
  INTO v_listings, v_active, v_views, v_phone, v_sales, v_quality
  FROM public.listings WHERE user_id = _user_id;

  v_quality := LEAST(1, COALESCE(v_quality, 0));

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

  SELECT COALESCE(AVG(rating), 0), COUNT(*), COUNT(*) FILTER (WHERE rating >= 4)
    INTO v_avg_rating, v_reviews, v_positive
    FROM public.seller_reviews
   WHERE seller_id = _user_id AND is_hidden = false;

  SELECT COALESCE(COUNT(*) / 3.0, 0) INTO v_freq
    FROM public.listings
   WHERE user_id = _user_id AND created_at > now() - interval '90 days';

  v_sales_norm  := LEAST(1, v_sales / NULLIF(t_sales,0));
  v_views_norm  := LEAST(1, v_views / NULLIF(t_views,0));
  v_age_norm    := LEAST(1, v_age_days / NULLIF(t_age,0));
  v_rating_norm := COALESCE(v_avg_rating,0) / 5.0;

  v_top := ROUND(
    (w_sales * v_sales_norm) + (w_rating * v_rating_norm) + (w_response * v_resp_rate)
    + (w_views * v_views_norm) + (w_age * v_age_norm) + (w_quality * v_quality)
  , 2);

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

  SELECT top_score INTO v_prev FROM public.seller_stats WHERE user_id = _user_id;

  INSERT INTO public.seller_stats AS s (
    user_id, display_name, avatar_url, city,
    listings_count, active_listings_count, total_views, total_phone_clicks,
    total_messages, sales_count, response_rate, avg_rating, reviews_count,
    positive_reviews_count, account_age_days, publish_frequency, quality_score,
    top_score, category_scores, last_computed_at
  )
  VALUES (
    _user_id, v_dn, v_av, v_city,
    v_listings, v_active, v_views, v_phone,
    v_msgs, v_sales, v_resp_rate, ROUND(COALESCE(v_avg_rating,0),2), v_reviews,
    v_positive, v_age_days, ROUND(v_freq,2), ROUND(v_quality,3),
    v_top, v_cat_scores, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    city = EXCLUDED.city,
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

  -- log history only when score changes meaningfully or first time
  IF v_prev IS NULL OR ABS(COALESCE(v_prev,0) - v_top) >= 0.01 THEN
    INSERT INTO public.seller_score_history (
      user_id, top_score, previous_score, delta,
      sales_count, total_views, total_phone_clicks, reviews_count,
      avg_rating, response_rate, quality_score, account_age_days, weights
    ) VALUES (
      _user_id, v_top, v_prev, COALESCE(v_top - COALESCE(v_prev,0), 0),
      v_sales, v_views, v_phone, v_reviews,
      ROUND(COALESCE(v_avg_rating,0),2), v_resp_rate, ROUND(v_quality,3), v_age_days,
      jsonb_build_object('sales',w_sales,'rating',w_rating,'response',w_response,'views',w_views,'age',w_age,'quality',w_quality)
    );
  END IF;
END;
$function$;
