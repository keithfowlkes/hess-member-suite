-- Create a function to notify the analytics refresh
CREATE OR REPLACE FUNCTION trigger_analytics_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Call the edge function to refresh analytics (asynchronous)
  PERFORM net.http_post(
    url := 'https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/auto-refresh-analytics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470'
    ),
    body := '{}'::jsonb
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on organizations table for INSERT and UPDATE
DROP TRIGGER IF EXISTS refresh_analytics_on_org_change ON organizations;
CREATE TRIGGER refresh_analytics_on_org_change
AFTER INSERT OR UPDATE ON organizations
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_analytics_refresh();