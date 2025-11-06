-- Delete old Unit4 entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%Unit4%' 
  AND option_value != 'Unit4';

-- Normalize HCM HR Unit4 entries in organizations
UPDATE organizations 
SET hcm_hr = 'Unit4'
WHERE hcm_hr ILIKE '%Unit4%' AND hcm_hr != 'Unit4';