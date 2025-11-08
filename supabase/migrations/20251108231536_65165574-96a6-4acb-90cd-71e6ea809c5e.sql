-- Delete old MIP variations from system_field_options (keeping only 'Abila MIP Fund Accounting')
DELETE FROM system_field_options 
WHERE field_name = 'financial_system'
  AND option_value ILIKE '%MIP%'
  AND option_value != 'Abila MIP Fund Accounting';

-- Normalize financial_system MIP entries in organizations
UPDATE organizations 
SET financial_system = 'Abila MIP Fund Accounting'
WHERE financial_system ILIKE '%MIP%'
  AND financial_system != 'Abila MIP Fund Accounting';