ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS platform text;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_platform ON public.push_subscriptions(platform);

-- Backfill platform from user_agent for existing rows
UPDATE public.push_subscriptions
SET platform = CASE
  WHEN user_agent ILIKE '%iphone%' OR user_agent ILIKE '%ipad%' OR user_agent ILIKE '%ipod%' THEN 'ios'
  WHEN user_agent ILIKE '%android%' THEN 'android'
  ELSE 'desktop'
END
WHERE platform IS NULL;