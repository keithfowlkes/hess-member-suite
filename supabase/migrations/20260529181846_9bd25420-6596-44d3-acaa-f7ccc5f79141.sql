INSERT INTO public.invoices (organization_id, invoice_number, amount, invoice_date, due_date, period_start_date, period_end_date, status, notes)
VALUES (
  'e3aff6c8-7a1e-4dca-943b-59662acde462',
  'TEST-ADMIN-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  1000.00,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  date_trunc('year', CURRENT_DATE)::date,
  (date_trunc('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::date,
  'sent',
  'Test invoice for Stripe payment flow verification (Administrator account)'
);