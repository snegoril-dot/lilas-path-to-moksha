
CREATE TABLE public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sankalpa text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result text NOT NULL DEFAULT 'in_progress',
  moves_count int NOT NULL DEFAULT 0,
  path jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_sessions TO authenticated;
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.game_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX game_sessions_user_started ON public.game_sessions(user_id, started_at DESC);

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  cell int,
  prompt text,
  user_text text,
  ai_reflection text,
  kind text NOT NULL DEFAULT 'reflection',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal" ON public.journal_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX journal_user_created ON public.journal_entries(user_id, created_at DESC);

CREATE TABLE public.weekly_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  summary text NOT NULL,
  focus_loka text,
  practices jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_recommendations TO authenticated;
GRANT ALL ON public.weekly_recommendations TO service_role;
ALTER TABLE public.weekly_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekly" ON public.weekly_recommendations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
