-- Sync admin test invoice amount to configured full_member_fee
UPDATE public.invoices
SET amount = COALESCE(
  (SELECT NULLIF(setting_value,'')::numeric FROM public.system_settings WHERE setting_key='full_member_fee'),
  amount
),
updated_at = now()
WHERE organization_id = 'e3aff6c8-7a1e-4dca-943b-59662acde462'
  AND invoice_number LIKE 'TEST-ADMIN-%';

-- Trigger: keep admin test invoice(s) in sync when full_member_fee changes
CREATE OR REPLACE FUNCTION public.sync_admin_test_invoice_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.setting_key = 'full_member_fee' AND NEW.setting_value IS NOT NULL AND NEW.setting_value <> '' THEN
    UPDATE public.invoices
    SET amount = NEW.setting_value::numeric,
        updated_at = now()
    WHERE organization_id = 'e3aff6c8-7a1e-4dca-943b-59662acde462'
      AND invoice_number LIKE 'TEST-ADMIN-%'
      AND status <> 'paid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_test_invoice_amount ON public.system_settings;
CREATE TRIGGER trg_sync_admin_test_invoice_amount
AFTER INSERT OR UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_test_invoice_amount();