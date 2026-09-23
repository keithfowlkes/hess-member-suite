-- lovable-cron-fallback-reviewed: job is created only when verifications are queued and removed once the queue drains; spreads AI checks over 24h
CREATE TABLE public.contact_verification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  queued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_verification_queue TO authenticated;
GRANT ALL ON public.contact_verification_queue TO service_role;
ALTER TABLE public.contact_verification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage verification queue" ON public.contact_verification_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_cvq_due ON public.contact_verification_queue (status, scheduled_for);

CREATE OR REPLACE FUNCTION public.ensure_contact_verification_job()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-contact-verification-queue') THEN
    PERFORM cron.schedule(
      'process-contact-verification-queue',
      '*/5 * * * *',
      $job$
      SELECT net.http_post(
        url := 'https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/process-contact-verification-queue',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470"}'::jsonb,
        body := '{}'::jsonb
      );
      $job$
    );
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.stop_contact_verification_job()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-contact-verification-queue') THEN
    PERFORM cron.unschedule('process-contact-verification-queue');
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.ensure_contact_verification_job() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.stop_contact_verification_job() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_contact_verification_job() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stop_contact_verification_job() TO authenticated, service_role;