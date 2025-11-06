-- Delete old Ellucian Banner entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'financial_system'
  AND option_value ILIKE '%Ellucian Banner%' 
  AND option_value != 'Ellucian Banner Finance';

-- Normalize Financial System Ellucian Banner entries in organizations
UPDATE organizations 
SET financial_system = 'Ellucian Banner Finance'
WHERE financial_system ILIKE '%Ellucian Banner%' AND financial_system != 'Ellucian Banner Finance';