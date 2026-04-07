
-- Create function to clean up old sync log entries
CREATE OR REPLACE FUNCTION public.cleanup_simplelists_sync_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.simplelists_sync_log
  WHERE created_at < NOW() - INTERVAL '14 days';
END;
$$;
