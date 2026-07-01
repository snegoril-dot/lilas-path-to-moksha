-- 1. Extensions
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- 2. Wrapper: reads secret from Vault and pings the reminders endpoint
create or replace function public.trigger_practice_reminders()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'practice_cron_secret'
   limit 1;

  if v_secret is null then
    raise notice 'practice_cron_secret not set in vault; skipping';
    return null;
  end if;

  select net.http_post(
    url     := 'https://project--9f8aa931-8a98-4594-a2a4-d44b6cf9a956.lovable.app/api/public/practice/send-reminders',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', v_secret
               ),
    body    := '{}'::jsonb
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.trigger_practice_reminders() from public, anon, authenticated;

-- 3. Schedule every 5 minutes (idempotent: unschedule if already exists)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'practice-reminders-5min') then
    perform cron.unschedule('practice-reminders-5min');
  end if;
end $$;

select cron.schedule(
  'practice-reminders-5min',
  '*/5 * * * *',
  $$ select public.trigger_practice_reminders(); $$
);