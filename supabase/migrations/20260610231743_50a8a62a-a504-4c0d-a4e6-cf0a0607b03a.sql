
DROP POLICY IF EXISTS "Anyone can insert push events" ON public.push_events;

CREATE POLICY "Service worker can insert valid push events"
  ON public.push_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (event_type IN ('delivered', 'click', 'dismiss'));
