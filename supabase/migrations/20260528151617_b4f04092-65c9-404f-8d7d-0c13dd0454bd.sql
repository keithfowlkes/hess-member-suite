
-- Refresh the cached totals so they match the live count (excludes Administrator accounts)
SELECT public.refresh_analytics_datacube_sql();

-- Ensure the datacube auto-refreshes when organizations change
DROP TRIGGER IF EXISTS organizations_refresh_analytics_datacube ON public.organizations;
CREATE TRIGGER organizations_refresh_analytics_datacube
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_analytics_refresh_sql();
