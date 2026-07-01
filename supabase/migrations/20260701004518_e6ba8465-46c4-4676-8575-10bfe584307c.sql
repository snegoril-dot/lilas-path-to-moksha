
ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'classic';

ALTER TABLE public.game_sessions
  DROP CONSTRAINT IF EXISTS game_sessions_mode_check;

ALTER TABLE public.game_sessions
  ADD CONSTRAINT game_sessions_mode_check CHECK (mode IN ('classic', 'soft'));
