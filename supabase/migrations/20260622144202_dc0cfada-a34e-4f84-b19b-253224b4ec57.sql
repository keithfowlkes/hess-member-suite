
-- Scheduled email queue (durable, drained by pg_cron)
CREATE TABLE public.scheduled_email_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL,
  email_type text NOT NULL DEFAULT 'custom',
  recipient text NOT NULL,
  subject text NOT NULL,
  template_html text NOT NULL,
  invoice_id uuid NULL,
  organization_id uuid NULL,
  organization_name text NULL,
  scheduled_send_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  CONSTRAINT scheduled_email_queue_status_check CHECK (status IN ('pending','sending','sent','failed','cancelled'))
);

GRANT SELECT, UPDATE ON public.scheduled_email_queue TO authenticated;
GRANT ALL ON public.scheduled_email_queue TO service_role;

ALTER TABLE public.scheduled_email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scheduled email queue"
  ON public.scheduled_email_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update scheduled email queue"
  ON public.scheduled_email_queue FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_scheduled_email_queue_due
  ON public.scheduled_email_queue (status, scheduled_send_at)
  WHERE status = 'pending';

CREATE INDEX idx_scheduled_email_queue_batch
  ON public.scheduled_email_queue (batch_id);

CREATE TRIGGER trg_scheduled_email_queue_updated_at
  BEFORE UPDATE ON public.scheduled_email_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Default bulk send window setting
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('bulk_email_window_hours', '12', 'Hours to spread bulk invoice email delivery across to avoid spam flags')
ON CONFLICT (setting_key) DO NOTHING;
