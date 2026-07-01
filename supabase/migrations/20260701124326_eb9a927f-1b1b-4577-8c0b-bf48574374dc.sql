
CREATE OR REPLACE FUNCTION public.admin_funnel_stats(_from timestamptz, _to timestamptz)
RETURNS TABLE(step text, users bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH ev AS (
    SELECT user_id, event_name FROM public.analytics_events
    WHERE created_at >= _from AND created_at < _to AND user_id IS NOT NULL
  ),
  rolls AS (
    SELECT user_id, count(*) c FROM ev WHERE event_name = 'dice_rolled' GROUP BY user_id
  )
  SELECT 'install'::text, count(DISTINCT user_id) FROM ev WHERE event_name = 'app_opened'
  UNION ALL SELECT 'sankalpa', count(DISTINCT user_id) FROM ev WHERE event_name = 'sankalpa_submitted'
  UNION ALL SELECT 'first_roll', count(DISTINCT user_id) FROM ev WHERE event_name IN ('first_roll','dice_rolled')
  UNION ALL SELECT 'five_rolls', count(*) FROM rolls WHERE c >= 5
  UNION ALL SELECT 'purchase',
    (SELECT count(DISTINCT user_id) FROM public.stars_payments
      WHERE refunded_at IS NULL AND created_at >= _from AND created_at < _to);
END;
$$;
