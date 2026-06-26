
DROP POLICY "own sessions" ON public.game_sessions;
CREATE POLICY "own sessions" ON public.game_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "own journal" ON public.journal_entries;
CREATE POLICY "own journal" ON public.journal_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "own weekly" ON public.weekly_recommendations;
CREATE POLICY "own weekly" ON public.weekly_recommendations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
