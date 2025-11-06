
-- Normalize Financial System Ellucian Colleague entries
UPDATE organizations 
SET financial_system = 'Ellucian Colleague Finance'
WHERE financial_system = 'Ellucian Colleague';

-- Also update system_field_options if it exists
UPDATE system_field_options 
SET option_value = 'Ellucian Colleague Finance'
WHERE field_name = 'financial_system'
  AND option_value = 'Ellucian Colleague';
