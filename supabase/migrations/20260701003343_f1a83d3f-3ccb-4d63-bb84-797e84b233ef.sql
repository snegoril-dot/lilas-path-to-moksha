-- Extend game_sessions to persist in-progress state
ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS current_cell integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dice_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS key_cells jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS entry_misses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS six_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS game_sessions_touch_updated_at ON public.game_sessions;
CREATE TRIGGER game_sessions_touch_updated_at
  BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX IF NOT EXISTS game_sessions_active_idx
  ON public.game_sessions (user_id, result, updated_at DESC);
