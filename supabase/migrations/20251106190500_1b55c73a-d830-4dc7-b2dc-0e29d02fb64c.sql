
-- First, delete old Jenzabar entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'financial_system'
  AND option_value ILIKE '%jenzabar%' 
  AND option_value != 'Jenzabar ONE Finance';

-- Now normalize Financial System Jenzabar entries in organizations
UPDATE organizations 
SET financial_system = 'Jenzabar ONE Finance'
WHERE financial_system ILIKE '%jenzabar%' AND financial_system != 'Jenzabar ONE Finance';
