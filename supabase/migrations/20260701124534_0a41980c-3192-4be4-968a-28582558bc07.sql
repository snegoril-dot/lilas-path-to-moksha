
ALTER TABLE public.user_entitlements DROP CONSTRAINT IF EXISTS user_entitlements_source_check;
ALTER TABLE public.user_entitlements ADD CONSTRAINT user_entitlements_source_check
  CHECK (source = ANY (ARRAY['stars'::text, 'grant'::text, 'beta'::text, 'admin_grant'::text, 'referral_bonus'::text]));

CREATE OR REPLACE FUNCTION public.admin_grant_entitlement(_target_user_id uuid, _feature text, _days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.user_entitlements (user_id, feature, status, source, expires_at)
  VALUES (_target_user_id, _feature, 'active', 'admin_grant',
          CASE WHEN _days > 0 THEN now() + make_interval(days => _days) ELSE NULL END)
  ON CONFLICT (user_id, feature) DO UPDATE
    SET status = 'active',
        source = 'admin_grant',
        expires_at = EXCLUDED.expires_at,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ban_user(_target_user_id uuid, _banned boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles
     SET banned_at = CASE WHEN _banned THEN now() ELSE NULL END,
         updated_at = now()
   WHERE id = _target_user_id;
END;
$$;
