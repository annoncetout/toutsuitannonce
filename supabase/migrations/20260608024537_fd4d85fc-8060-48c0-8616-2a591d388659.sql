
-- 1) Add Pro plan enum values
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'starter_pro';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'business_pro';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'elite_pro';

-- 2) Allow users to create their own pending subscription payment requests
DROP POLICY IF EXISTS "Users can request own subscription payments" ON public.transactions;
CREATE POLICY "Users can request own subscription payments"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type = 'subscription'::transaction_type
  AND status = 'pending'::transaction_status
);

-- 3) Activate Pro subscription on payment completion + notify user
CREATE OR REPLACE FUNCTION public.activate_subscription_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.subscription_plan;
  v_plan_text text;
  v_label text;
BEGIN
  IF NEW.type <> 'subscription' THEN
    RETURN NEW;
  END IF;
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  v_plan_text := COALESCE(NEW.metadata->>'plan', NEW.metadata->>'offer_id');
  v_label := COALESCE(NEW.metadata->>'offer_label', v_plan_text, 'Abonnement Pro');

  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- map plan text to enum (default business_pro if unknown)
    BEGIN
      v_plan := v_plan_text::public.subscription_plan;
    EXCEPTION WHEN others THEN
      v_plan := 'business_pro'::public.subscription_plan;
    END;

    INSERT INTO public.subscriptions (user_id, plan, status, started_at, expires_at)
    VALUES (
      NEW.user_id,
      v_plan,
      'active'::public.subscription_status,
      now(),
      now() + interval '30 days'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET plan       = EXCLUDED.plan,
          status     = 'active'::public.subscription_status,
          started_at = now(),
          expires_at = GREATEST(COALESCE(public.subscriptions.expires_at, now()), now()) + interval '30 days',
          updated_at = now();

    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      NEW.user_id,
      'subscription_approved',
      'Abonnement activé ✅',
      'Votre abonnement « ' || v_label || ' » est maintenant actif pour 30 jours.',
      '/dashboard',
      jsonb_build_object('transaction_id', NEW.id, 'plan', v_plan_text)
    );
  ELSIF NEW.status IN ('failed','refunded') AND OLD.status NOT IN ('failed','refunded') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      NEW.user_id,
      'subscription_rejected',
      'Paiement refusé ❌',
      'Le paiement pour « ' || v_label || ' » a été refusé. Contactez-nous si besoin.',
      '/dashboard',
      jsonb_build_object('transaction_id', NEW.id, 'plan', v_plan_text)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_subscription_on_payment ON public.transactions;
CREATE TRIGGER trg_activate_subscription_on_payment
AFTER UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.activate_subscription_on_payment();
