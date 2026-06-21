
CREATE OR REPLACE FUNCTION public.notify_onesignal_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_should boolean := false;
  v_image text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_should := NEW.is_active = true AND NEW.moderation_status = 'approved';
  ELSIF TG_OP = 'UPDATE' THEN
    v_should := NEW.is_active = true AND NEW.moderation_status = 'approved'
             AND (OLD.moderation_status IS DISTINCT FROM 'approved' OR OLD.is_active = false);
  END IF;

  IF NOT v_should THEN RETURN NEW; END IF;

  v_image := CASE WHEN NEW.images IS NOT NULL AND array_length(NEW.images, 1) >= 1
                  THEN NEW.images[1] ELSE NULL END;

  BEGIN
    PERFORM net.http_post(
      url := 'https://yyendbkedzfnsmjiclhg.supabase.co/functions/v1/onesignal-notify-listing',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'listing_id', NEW.id,
        'title', NEW.title,
        'image', v_image
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onesignal_new_listing_ins ON public.listings;
DROP TRIGGER IF EXISTS trg_onesignal_new_listing_upd ON public.listings;

CREATE TRIGGER trg_onesignal_new_listing_ins
AFTER INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.notify_onesignal_new_listing();

CREATE TRIGGER trg_onesignal_new_listing_upd
AFTER UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.notify_onesignal_new_listing();
