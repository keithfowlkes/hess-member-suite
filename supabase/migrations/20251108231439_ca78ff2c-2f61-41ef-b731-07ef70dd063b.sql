-- Delete old CAMS variations from system_field_options (keeping only 'Unit4')
DELETE FROM system_field_options 
WHERE field_name = 'financial_system'
  AND option_value ILIKE '%CAMS%'
  AND option_value != 'Unit4';

-- Normalize financial_system CAMS entries in organizations
UPDATE organizations 
SET financial_system = 'Unit4'
WHERE financial_system ILIKE '%CAMS%'
  AND financial_system != 'Unit4';