-- Delete old In-house developed entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%In-house developed%' 
  AND option_value != 'In-house Developed';

-- Normalize HCM HR In-house developed entries in organizations
UPDATE organizations 
SET hcm_hr = 'In-house Developed'
WHERE hcm_hr ILIKE '%In-house developed%' AND hcm_hr != 'In-house Developed';