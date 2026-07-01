
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_guru_usage(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_entitlement(uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_funnel_stats(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_growth_stats() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_guru_usage(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_entitlement(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_funnel_stats(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_growth_stats() TO authenticated;
