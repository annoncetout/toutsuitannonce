
-- Push analytics events table
CREATE TABLE public.push_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('delivered','open','click','dismiss','failed')),
  endpoint_hash text,
  user_agent text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_events TO authenticated;
GRANT ALL ON public.push_events TO service_role;
GRANT INSERT ON public.push_events TO anon;
GRANT INSERT ON public.push_events TO authenticated;

ALTER TABLE public.push_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read push_events"
  ON public.push_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert push events"
  ON public.push_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_push_events_created_at ON public.push_events (created_at DESC);
CREATE INDEX idx_push_events_notification ON public.push_events (notification_id);
CREATE INDEX idx_push_events_type ON public.push_events (event_type);

-- Helper: notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins(_type text, _title text, _body text, _link text, _metadata jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  SELECT ur.user_id, _type, _title, _body, _link, COALESCE(_metadata, '{}'::jsonb)
    FROM public.user_roles ur
   WHERE ur.role = 'admin'::app_role;
END;
$$;

-- Trigger: notify admins on new listing insert
CREATE OR REPLACE FUNCTION public.notify_admins_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author text;
BEGIN
  SELECT COALESCE(display_name, 'Un utilisateur') INTO v_author
    FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.notify_admins(
    'admin_new_listing',
    '📝 Nouvelle annonce publiée',
    v_author || ' a publié « ' || NEW.title || ' »',
    '/annonce/' || NEW.id,
    jsonb_build_object('listing_id', NEW.id, 'user_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_listing ON public.listings;
CREATE TRIGGER trg_notify_admins_new_listing
  AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_listing();

-- Trigger: notify admins on moderation case (reported listing)
CREATE OR REPLACE FUNCTION public.notify_admins_moderation_case()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.reports_count IS DISTINCT FROM NEW.reports_count) THEN
    SELECT title INTO v_title FROM public.listings WHERE id = NEW.listing_id;
    PERFORM public.notify_admins(
      'admin_listing_reported',
      '🚨 Annonce signalée',
      'L''annonce « ' || COALESCE(v_title,'?') || ' » a ' || NEW.reports_count || ' signalement(s).',
      '/admin?case=' || NEW.id,
      jsonb_build_object('case_id', NEW.id, 'listing_id', NEW.listing_id, 'reports_count', NEW.reports_count)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_moderation_case ON public.moderation_cases;
CREATE TRIGGER trg_notify_admins_moderation_case
  AFTER INSERT OR UPDATE ON public.moderation_cases
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_moderation_case();

-- Extend premium activation to notify admins
CREATE OR REPLACE FUNCTION public.activate_premium_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duration_days int;
  boost_type text;
  v_title text;
  v_owner text;
BEGIN
  IF NEW.type = 'listing_boost'
     AND NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.listing_id IS NOT NULL
  THEN
    duration_days := COALESCE((NEW.metadata ->> 'duration_days')::int, 30);
    boost_type := COALESCE(NEW.metadata ->> 'boost_type', 'premium');

    IF boost_type = 'urgent' THEN
      UPDATE public.listings
         SET is_urgent    = true,
             urgent_until = COALESCE(urgent_until, now()) + (duration_days || ' days')::interval
       WHERE id = NEW.listing_id;
    ELSE
      UPDATE public.listings
         SET is_premium    = true,
             is_featured   = true,
             premium_until = COALESCE(premium_until, now()) + (duration_days || ' days')::interval
       WHERE id = NEW.listing_id;
    END IF;

    SELECT l.title, p.display_name INTO v_title, v_owner
      FROM public.listings l LEFT JOIN public.profiles p ON p.id = l.user_id
     WHERE l.id = NEW.listing_id;

    PERFORM public.notify_admins(
      'admin_listing_premium',
      '⭐ Annonce mise en avant',
      COALESCE(v_owner,'?') || ' a activé ' || boost_type || ' sur « ' || COALESCE(v_title,'?') || ' »',
      '/annonce/' || NEW.listing_id,
      jsonb_build_object('listing_id', NEW.listing_id, 'boost_type', boost_type, 'duration_days', duration_days)
    );
  END IF;
  RETURN NEW;
END;
$$;
