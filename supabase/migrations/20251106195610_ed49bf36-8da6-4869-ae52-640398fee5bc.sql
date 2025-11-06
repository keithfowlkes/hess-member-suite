-- Delete old Oracle entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%Oracle%' 
  AND option_value != 'Oracle Cloud HCM';

-- Normalize HCM HR Oracle entries in organizations
UPDATE organizations 
SET hcm_hr = 'Oracle Cloud HCM'
WHERE hcm_hr ILIKE '%Oracle%' AND hcm_hr != 'Oracle Cloud HCM';