
-- Create trigger on organizations table to auto-refresh datacube on changes
CREATE TRIGGER trigger_refresh_datacube_on_org_change
AFTER INSERT OR UPDATE OR DELETE ON organizations
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_analytics_refresh_sql();

-- Schedule cron job to refresh datacube every 30 minutes
SELECT cron.schedule(
  'refresh-analytics-datacube-30min',
  '*/30 * * * *',
  $$
  SELECT refresh_analytics_datacube_sql();
  $$
);
