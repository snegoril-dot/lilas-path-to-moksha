
CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  anon_id text,
  session_id uuid,
  cell integer,
  rating smallint,
  understood text,
  confused text,
  resonated text,
  improve text,
  app_version text,
  platform text,
  context text
);

GRANT INSERT ON public.beta_feedback TO anon, authenticated;
GRANT ALL ON public.beta_feedback TO service_role;

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submit own feedback"
  ON public.beta_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    ((auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR (auth.uid() IS NULL AND user_id IS NULL))
    AND (rating IS NULL OR (rating BETWEEN 1 AND 5))
    AND coalesce(length(understood), 0) <= 1000
    AND coalesce(length(confused), 0) <= 1000
    AND coalesce(length(resonated), 0) <= 1000
    AND coalesce(length(improve), 0) <= 1000
  );
