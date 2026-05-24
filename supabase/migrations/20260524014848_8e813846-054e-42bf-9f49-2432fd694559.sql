
CREATE TABLE public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  image_url text,
  discount integer,
  button_text text,
  redirect_url text,
  theme_color text DEFAULT '#d4af37',
  animation_type text NOT NULL DEFAULT 'fade',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active ads viewable by everyone"
  ON public.advertisements FOR SELECT
  USING (is_active = true AND now() BETWEEN start_date AND end_date);

CREATE POLICY "Admins view all ads"
  ON public.advertisements FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert ads"
  ON public.advertisements FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update ads"
  ON public.advertisements FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete ads"
  ON public.advertisements FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_advertisements_active_dates ON public.advertisements (is_active, start_date, end_date);
CREATE INDEX idx_advertisements_position ON public.advertisements (position);

CREATE OR REPLACE FUNCTION public.increment_ad_metric(_ad_id uuid, _metric text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _metric = 'impression' THEN
    UPDATE public.advertisements
       SET impressions = impressions + 1
     WHERE id = _ad_id
       AND is_active = true
       AND now() BETWEEN start_date AND end_date;
  ELSIF _metric = 'click' THEN
    UPDATE public.advertisements
       SET clicks = clicks + 1
     WHERE id = _ad_id
       AND is_active = true
       AND now() BETWEEN start_date AND end_date;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ad_metric(uuid, text) TO anon, authenticated;
