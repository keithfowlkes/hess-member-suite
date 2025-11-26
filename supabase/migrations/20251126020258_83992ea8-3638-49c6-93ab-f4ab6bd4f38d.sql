-- Function to refresh public organization directory view
-- This is a placeholder function that can be enhanced if the view becomes materialized
CREATE OR REPLACE FUNCTION public.refresh_public_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If public_organization_directory is a materialized view, uncomment:
  -- REFRESH MATERIALIZED VIEW public_organization_directory;
  
  -- For now, this function serves as a placeholder
  -- Regular views refresh automatically, but this can be used for future enhancements
  RAISE NOTICE 'Public views refresh called at %', NOW();
END;
$$;

-- Comment with instructions for setting up the cron job
COMMENT ON FUNCTION public.refresh_public_views() IS 
'Refreshes public organization views. 
To set up automatic refresh every 15 minutes, run this SQL in the SQL Editor:

-- Enable required extensions (only needs to be done once)
-- Requires admin access
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the refresh job (update with your project details)
-- select cron.schedule(
--   ''refresh-public-views-every-15-min'',
--   ''*/15 * * * *'', -- Every 15 minutes
--   $$
--   select net.http_post(
--     url := ''https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/refresh-public-views'',
--     headers := ''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470"}''::jsonb,
--     body := concat(''{"time": "'', now(), ''"}'')::jsonb
--   ) as request_id;
--   $$
-- );

-- To view all cron jobs:
-- SELECT * FROM cron.job;

-- To unschedule the job:
-- SELECT cron.unschedule(''refresh-public-views-every-15-min'');
';