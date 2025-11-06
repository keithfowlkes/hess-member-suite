-- Delete old Campus Management entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'financial_system'
  AND option_value ILIKE '%Campus Management%' 
  AND option_value != 'Anthology';

-- Normalize Financial System Campus Management entries in organizations
UPDATE organizations 
SET financial_system = 'Anthology'
WHERE financial_system ILIKE '%Campus Management%' AND financial_system != 'Anthology';