-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the analytics datacube refresh to run every hour
SELECT cron.schedule(
  'refresh-analytics-datacube-hourly',
  '0 * * * *', -- At the start of every hour
  $$
  SELECT
    net.http_post(
      url := 'https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/auto-refresh-analytics',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470'
      ),
      body := jsonb_build_object('scheduled', true, 'time', now())
    ) as request_id;
  $$
);