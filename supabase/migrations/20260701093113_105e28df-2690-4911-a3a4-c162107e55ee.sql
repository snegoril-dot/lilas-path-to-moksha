
-- 1) practice_sessions: активные и завершённые практики игрока
CREATE TABLE public.practice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cell_id INTEGER NOT NULL,
  practice_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sankalpa_bridge TEXT,
  duration TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  resonance SMALLINT,
  emotions TEXT[] NOT NULL DEFAULT '{}',
  reflection TEXT,
  steps_checked INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX practice_sessions_user_active_idx
  ON public.practice_sessions(user_id, status);
CREATE INDEX practice_sessions_user_started_idx
  ON public.practice_sessions(user_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;
GRANT ALL ON public.practice_sessions TO service_role;

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own practice sessions"
  ON public.practice_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER practice_sessions_touch_updated_at
  BEFORE UPDATE ON public.practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 2) practice_journal_entries: свободные записи дневника
CREATE TABLE public.practice_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
  cell_id INTEGER,
  text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX practice_journal_user_created_idx
  ON public.practice_journal_entries(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_journal_entries TO authenticated;
GRANT ALL ON public.practice_journal_entries TO service_role;

ALTER TABLE public.practice_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own journal entries"
  ON public.practice_journal_entries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER practice_journal_entries_touch_updated_at
  BEFORE UPDATE ON public.practice_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 3) practice_reminders: настройки тихого режима и утренних напоминаний
CREATE TABLE public.practice_reminders (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  time_of_day TEXT NOT NULL DEFAULT '09:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  quiet_until TIMESTAMPTZ,
  morning_sankalpa_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_reminders TO authenticated;
GRANT ALL ON public.practice_reminders TO service_role;

ALTER TABLE public.practice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own reminders"
  ON public.practice_reminders FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER practice_reminders_touch_updated_at
  BEFORE UPDATE ON public.practice_reminders
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 4) sankalpa_history: история формулировок игрока
CREATE TABLE public.sankalpa_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'game',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sankalpa_history_user_created_idx
  ON public.sankalpa_history(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sankalpa_history TO authenticated;
GRANT ALL ON public.sankalpa_history TO service_role;

ALTER TABLE public.sankalpa_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own sankalpa history"
  ON public.sankalpa_history FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
