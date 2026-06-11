-- 1) Drop duplicate premium trigger (already covered by approved-listing trigger)
DROP TRIGGER IF EXISTS trg_notify_new_premium_listing ON public.listings;

-- 2) Backfill notification_preferences for every user that doesn't have one
INSERT INTO public.notification_preferences (user_id, enabled)
SELECT u.id, true
  FROM auth.users u
  LEFT JOIN public.notification_preferences p ON p.user_id = u.id
 WHERE p.user_id IS NULL;

-- 3) Make sure new auth users get a preference row (current trigger is on profiles; add safety on auth.users)
-- Already handled by handle_new_user -> profiles -> trg_create_default_notif_prefs. Keep as-is.

-- 4) Rewrite the trigger so users WITHOUT a preferences row still receive notifications by default
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

  -- Notify every user. If they have preferences, respect category/city filter and enabled flag.
  -- If they have NO preferences row, notify them by default.
  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  SELECT
    u.id,
    CASE WHEN NEW.is_premium THEN 'new_premium_listing' ELSE 'new_approved_listing' END,
    v_title_prefix,
    v_body,
    '/annonce/' || NEW.id,
    jsonb_build_object('listing_id', NEW.id, 'category_id', NEW.category_id, 'city', NEW.location, 'is_premium', NEW.is_premium)
  FROM auth.users u
  LEFT JOIN public.notification_preferences p ON p.user_id = u.id
  WHERE u.id <> NEW.user_id
    AND COALESCE(p.enabled, true) = true
    AND (p.categories IS NULL OR array_length(p.categories, 1) IS NULL OR NEW.category_id = ANY(p.categories))
    AND (p.city IS NULL OR p.city = '' OR NEW.location ILIKE '%' || p.city || '%');

  RETURN NEW;
END;
$function$;