
-- 1. Ban flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- 2. Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  ref_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_user_id);

-- 3. Admin funnel stats
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
  SELECT 'install'::text, count(DISTINCT user_id) FROM ev WHERE event_name = 'app_open'
  UNION ALL SELECT 'sankalpa', count(DISTINCT user_id) FROM ev WHERE event_name = 'sankalpa_saved'
  UNION ALL SELECT 'first_roll', count(DISTINCT user_id) FROM ev WHERE event_name = 'dice_rolled'
  UNION ALL SELECT 'five_rolls', count(*) FROM rolls WHERE c >= 5
  UNION ALL SELECT 'purchase', count(DISTINCT user_id) FROM ev WHERE event_name = 'paywall_purchase_success';
END;
$$;

-- 4. Growth stats: DAU/WAU/MAU/ARPPU
CREATE OR REPLACE FUNCTION public.admin_growth_stats()
RETURNS TABLE(dau bigint, wau bigint, mau bigint, revenue_7d bigint, revenue_30d bigint, arppu_30d numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT count(DISTINCT user_id) FROM public.analytics_events WHERE created_at >= now() - interval '1 day' AND user_id IS NOT NULL),
    (SELECT count(DISTINCT user_id) FROM public.analytics_events WHERE created_at >= now() - interval '7 days' AND user_id IS NOT NULL),
    (SELECT count(DISTINCT user_id) FROM public.analytics_events WHERE created_at >= now() - interval '30 days' AND user_id IS NOT NULL),
    (SELECT coalesce(sum(stars_amount),0) FROM public.stars_payments WHERE refunded_at IS NULL AND created_at >= now() - interval '7 days'),
    (SELECT coalesce(sum(stars_amount),0) FROM public.stars_payments WHERE refunded_at IS NULL AND created_at >= now() - interval '30 days'),
    (SELECT CASE WHEN count(DISTINCT user_id)=0 THEN 0 ELSE sum(stars_amount)::numeric / count(DISTINCT user_id) END
       FROM public.stars_payments WHERE refunded_at IS NULL AND created_at >= now() - interval '30 days');
END;
$$;

-- 5. Grant admin role helper (called by ban/grant flows via service_role only)
CREATE OR REPLACE FUNCTION public.admin_ban_user(_target_user_id uuid, _banned boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles
     SET banned_at = CASE WHEN _banned THEN now() ELSE NULL END,
         updated_at = now()
   WHERE user_id = _target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_entitlement(_target_user_id uuid, _feature text, _days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.user_entitlements (user_id, feature_key, status, source, expires_at)
  VALUES (_target_user_id, _feature, 'active', 'admin_grant',
          CASE WHEN _days > 0 THEN now() + make_interval(days => _days) ELSE NULL END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_funnel_stats(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_growth_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_entitlement(uuid, text, integer) TO authenticated;
