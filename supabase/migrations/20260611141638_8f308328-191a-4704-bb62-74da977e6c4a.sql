-- 1) Make public views run as the querying user (fixes SECURITY DEFINER view warning)
ALTER VIEW public.profiles_public SET (security_invoker = on);
ALTER VIEW public.seller_score_history_public SET (security_invoker = on);

-- 2) Hide internal moderation/internal counters from anonymous users on seller_stats.
-- Anonymous visitors keep access to the public ranking columns; authenticated users
-- (including admins) retain their existing access via RLS + GRANTs.
REVOKE SELECT (fraud_flags, suspension_reason, total_messages, total_phone_clicks, is_suspended)
  ON public.seller_stats FROM anon;
