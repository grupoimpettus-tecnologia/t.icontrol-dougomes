-- lovable-cron-fallback-reviewed: monitoramento de disponibilidade exige detecção em minutos; cada monitor respeita seu próprio intervalo
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('ticontrol-run-checks')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ticontrol-run-checks');

SELECT cron.schedule(
  'ticontrol-run-checks',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--2a32edee-9fa4-4646-baed-33ea40eb65c9-dev.lovable.app/api/public/cron/run-checks',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', '8fe645775d8e0028abae5c3fa6b9574eaa64a2d20ba6c188'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);