-- Delete old Ellucian Colleague entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%Ellucian Colleague%' 
  AND option_value != 'Ellucian Colleague HR';

-- Normalize HCM HR Ellucian Colleague entries in organizations
UPDATE organizations 
SET hcm_hr = 'Ellucian Colleague HR'
WHERE hcm_hr ILIKE '%Ellucian Colleague%' AND hcm_hr != 'Ellucian Colleague HR';