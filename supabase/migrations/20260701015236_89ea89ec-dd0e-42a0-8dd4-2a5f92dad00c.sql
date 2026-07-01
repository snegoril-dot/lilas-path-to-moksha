CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  anon_id text,
  session_id uuid,
  event_name text NOT NULL,
  cell integer,
  dice integer,
  platform text,
  app_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_user ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_events_name ON public.analytics_events (event_name, created_at DESC);

GRANT INSERT ON public.analytics_events TO authenticated, anon;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (signed in or anonymous) can insert their own analytics rows.
-- Authenticated users must attach their own user_id; anon users must leave it null.
CREATE POLICY "insert own analytics"
  ON public.analytics_events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Nobody can read via the Data API. Analysis happens via service_role.
