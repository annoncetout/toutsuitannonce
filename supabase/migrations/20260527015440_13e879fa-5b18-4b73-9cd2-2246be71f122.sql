
-- 1) PROFILES: restrict phone/whatsapp to authenticated users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Public profile basics viewable by anon"
ON public.profiles FOR SELECT TO anon USING (true);

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_url, city, account_type, is_verified, status, created_at, updated_at) ON public.profiles TO anon;

-- 2) LISTINGS: prevent owners from updating privileged fields
CREATE OR REPLACE FUNCTION public.guard_listing_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.is_premium       := OLD.is_premium;
    NEW.is_featured      := OLD.is_featured;
    NEW.is_urgent        := OLD.is_urgent;
    NEW.premium_until    := OLD.premium_until;
    NEW.urgent_until     := OLD.urgent_until;
    NEW.moderation_status:= OLD.moderation_status;
    NEW.trust_score      := OLD.trust_score;
    NEW.quarantined_at   := OLD.quarantined_at;
    NEW.auto_removed     := OLD.auto_removed;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.views_count      := OLD.views_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_listing_privileged_fields_trigger ON public.listings;
CREATE TRIGGER guard_listing_privileged_fields_trigger
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_privileged_fields();

-- 3) LISTINGS: hide internal moderation columns from anon
REVOKE SELECT ON public.listings FROM anon;
GRANT SELECT (
  id, user_id, category_id, title, description, price, currency, price_type,
  location, images, is_active, is_premium, is_featured, is_urgent,
  premium_until, urgent_until, views_count, published_at, expires_at,
  created_at, updated_at
) ON public.listings TO anon;

-- 4) SITE_SETTINGS: drop public read of moderation_config
DROP POLICY IF EXISTS "Public read moderation_config" ON public.site_settings;

-- 5) SECURITY DEFINER functions: revoke public/anon/authenticated EXECUTE
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_ad_metric(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_metric(uuid, text) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.expire_premium_listings() FROM PUBLIC, anon, authenticated;
