-- Delete old Workday entries from system_field_options for financial_system
DELETE FROM system_field_options 
WHERE field_name = 'financial_system'
  AND option_value ILIKE '%Workday%';

-- Normalize Financial System Workday entries to Ellucian Banner Finance in organizations
UPDATE organizations 
SET financial_system = 'Ellucian Banner Finance'
WHERE financial_system ILIKE '%Workday%' AND financial_system != 'Ellucian Banner Finance';