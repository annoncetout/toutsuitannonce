
-- Replace premium-only notification with approved-listing notification
CREATE OR REPLACE FUNCTION public.notify_new_approved_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_should_notify boolean := false;
  v_body text;
  v_price text;
  v_title_prefix text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_should_notify := NEW.is_active = true AND NEW.moderation_status = 'approved';
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_notify := NEW.is_active = true AND NEW.moderation_status = 'approved'
                   AND (OLD.moderation_status IS DISTINCT FROM 'approved' OR OLD.is_active = false);
  END IF;

  IF NOT v_should_notify THEN
    RETURN NEW;
  END IF;

  v_price := CASE
    WHEN NEW.price IS NOT NULL THEN '💰 ' || NEW.price::text || ' ' || COALESCE(NEW.currency, 'FCFA')
    ELSE ''
  END;
  v_title_prefix := CASE WHEN NEW.is_premium = true THEN '🔥 Nouvelle annonce premium' ELSE '🆕 Nouvelle annonce' END;
  v_body := '"' || NEW.title || '"'
            || CASE WHEN NEW.location IS NOT NULL THEN E'\n📍 ' || NEW.location ELSE '' END
            || CASE WHEN v_price <> '' THEN E'\n' || v_price ELSE '' END;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  SELECT
    p.user_id,
    CASE WHEN NEW.is_premium THEN 'new_premium_listing' ELSE 'new_approved_listing' END,
    v_title_prefix,
    v_body,
    '/annonce/' || NEW.id,
    jsonb_build_object('listing_id', NEW.id, 'category_id', NEW.category_id, 'city', NEW.location, 'is_premium', NEW.is_premium)
  FROM public.notification_preferences p
  WHERE p.enabled = true
    AND p.user_id <> NEW.user_id
    AND (array_length(p.categories, 1) IS NULL OR NEW.category_id = ANY(p.categories))
    AND (p.city IS NULL OR p.city = '' OR NEW.location ILIKE '%' || p.city || '%');

  RETURN NEW;
END;
$function$;

-- Drop old triggers calling premium-only function
DROP TRIGGER IF EXISTS trg_notify_new_premium_listing_insert ON public.listings;
DROP TRIGGER IF EXISTS trg_notify_new_premium_listing_update ON public.listings;
DROP TRIGGER IF EXISTS notify_new_premium_listing_insert ON public.listings;
DROP TRIGGER IF EXISTS notify_new_premium_listing_update ON public.listings;
DROP TRIGGER IF EXISTS notify_new_premium_listing_trg ON public.listings;
DROP TRIGGER IF EXISTS trg_notify_new_approved_listing_insert ON public.listings;
DROP TRIGGER IF EXISTS trg_notify_new_approved_listing_update ON public.listings;

CREATE TRIGGER trg_notify_new_approved_listing_insert
AFTER INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.notify_new_approved_listing();

CREATE TRIGGER trg_notify_new_approved_listing_update
AFTER UPDATE OF moderation_status, is_active ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.notify_new_approved_listing();
