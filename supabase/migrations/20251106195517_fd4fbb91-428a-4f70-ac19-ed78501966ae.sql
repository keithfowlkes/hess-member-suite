-- Delete old Banner entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%Banner%' 
  AND option_value != 'Ellucian Banner HCM';

-- Normalize HCM HR Banner entries in organizations
UPDATE organizations 
SET hcm_hr = 'Ellucian Banner HCM'
WHERE hcm_hr ILIKE '%Banner%' AND hcm_hr != 'Ellucian Banner HCM';