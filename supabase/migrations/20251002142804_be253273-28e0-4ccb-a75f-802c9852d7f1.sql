-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create table to store backup metadata
CREATE TABLE IF NOT EXISTS public.database_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_data JSONB NOT NULL,
  backup_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  backup_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'scheduled'
  table_count INTEGER,
  row_count INTEGER
);

-- Enable RLS
ALTER TABLE public.database_backups ENABLE ROW LEVEL SECURITY;

-- Admin can manage backups
CREATE POLICY "Admins can manage backups"
ON public.database_backups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index on created_at for efficient querying
CREATE INDEX idx_database_backups_created_at ON public.database_backups(created_at DESC);

-- Function to cleanup old backups (keep only last 3)
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete backups older than the 3 most recent
  DELETE FROM public.database_backups
  WHERE id NOT IN (
    SELECT id FROM public.database_backups
    ORDER BY created_at DESC
    LIMIT 3
  );
END;
$$;

-- Trigger to automatically cleanup after insert
CREATE OR REPLACE FUNCTION public.trigger_cleanup_old_backups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.cleanup_old_backups();
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_backup_insert
AFTER INSERT ON public.database_backups
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_cleanup_old_backups();

-- Schedule automated backup every day at 2 AM
SELECT cron.schedule(
  'daily-database-backup',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/scheduled-backup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);