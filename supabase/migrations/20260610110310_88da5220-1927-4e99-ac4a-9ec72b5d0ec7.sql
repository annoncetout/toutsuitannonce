
ALTER TABLE public.seller_stats
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS city text;

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
  v_dn text; v_av text; v_city text;
BEGIN
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

  v_sales_norm  := LEAST(1, v_sales / 30.0);
  v_views_norm  := LEAST(1, v_views / 5000.0);
  v_age_norm    := LEAST(1, v_age_days / 365.0);
  v_rating_norm := COALESCE(v_avg_rating,0) / 5.0;

  v_top := ROUND(
    (30 * v_sales_norm) + (20 * v_rating_norm) + (15 * v_resp_rate)
    + (15 * v_views_norm) + (10 * v_age_norm) + (10 * v_quality)
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
END;
$$;
