-- Delete old Great Plains entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%Great Plains%' 
  AND option_value != 'Microsoft Dynamics';

-- Normalize HCM HR Great Plains entries in organizations
UPDATE organizations 
SET hcm_hr = 'Microsoft Dynamics'
WHERE hcm_hr ILIKE '%Great Plains%' AND hcm_hr != 'Microsoft Dynamics';