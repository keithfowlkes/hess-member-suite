CREATE UNIQUE INDEX IF NOT EXISTS invoices_payment_source_external_reference_unique
ON public.invoices (payment_source, external_reference);