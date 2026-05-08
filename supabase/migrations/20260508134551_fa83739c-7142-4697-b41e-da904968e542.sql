-- Audit table for inbound payment webhooks
CREATE TABLE IF NOT EXISTS public.inbound_payment_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payload JSONB NOT NULL,
  matched_organization_id UUID NULL,
  matched_invoice_id UUID NULL,
  organization_name TEXT NULL,
  contact_email TEXT NULL,
  amount_paid NUMERIC NULL,
  currency TEXT NULL,
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  external_reference TEXT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  error_message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inbound_payment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view inbound payment notifications"
ON public.inbound_payment_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update inbound payment notifications"
ON public.inbound_payment_notifications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ipn_received_at ON public.inbound_payment_notifications (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_ipn_external_reference ON public.inbound_payment_notifications (external_reference);
CREATE INDEX IF NOT EXISTS idx_ipn_status ON public.inbound_payment_notifications (status);

-- Extend invoices for external payment tracking
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_source TEXT NULL,
  ADD COLUMN IF NOT EXISTS external_reference TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoices_payment_source_ref
  ON public.invoices (payment_source, external_reference)
  WHERE payment_source IS NOT NULL AND external_reference IS NOT NULL;