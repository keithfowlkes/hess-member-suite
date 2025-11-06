-- Delete old Anthology/Campus Management entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%Anthology/Campus Management%' 
  AND option_value != 'Anthology';

-- Normalize HCM HR Anthology/Campus Management entries in organizations
UPDATE organizations 
SET hcm_hr = 'Anthology'
WHERE hcm_hr ILIKE '%Anthology/Campus Management%' AND hcm_hr != 'Anthology';