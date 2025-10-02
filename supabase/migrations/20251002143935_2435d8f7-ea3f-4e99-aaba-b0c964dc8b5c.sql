-- Drop the existing cron job
SELECT cron.unschedule('daily-database-backup');

-- Add default backup schedule settings to system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('backup_schedule_enabled', 'true', 'Whether automated backups are enabled'),
  ('backup_schedule_frequency', 'daily', 'Backup frequency: hourly, daily, weekly, or monthly'),
  ('backup_schedule_time', '02:00', 'Time to run backup (HH:MM format)'),
  ('backup_schedule_day_of_week', '1', 'Day of week for weekly backups (1=Monday, 7=Sunday)'),
  ('backup_schedule_day_of_month', '1', 'Day of month for monthly backups (1-28)')
ON CONFLICT (setting_key) DO NOTHING;

-- Create a new cron job that runs every hour and checks if backup should be performed
SELECT cron.schedule(
  'configurable-database-backup',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
        url:='https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/scheduled-backup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);