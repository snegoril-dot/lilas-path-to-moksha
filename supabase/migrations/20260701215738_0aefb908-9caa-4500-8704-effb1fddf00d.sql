-- Tighten RLS: policies with role `public` (implicit anon+authenticated)
-- move to `authenticated` only. auth.uid() based policies already correct.
DROP POLICY IF EXISTS "Own journal entries" ON public.practice_journal_entries;
CREATE POLICY "Own journal entries" ON public.practice_journal_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own reminders" ON public.practice_reminders;
CREATE POLICY "Own reminders" ON public.practice_reminders
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own practice sessions" ON public.practice_sessions;
CREATE POLICY "Own practice sessions" ON public.practice_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own sankalpa history" ON public.sankalpa_history;
CREATE POLICY "Own sankalpa history" ON public.sankalpa_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);