-- Delete old Workday entries from system_field_options (excluding the target value)
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%Workday%' 
  AND option_value != 'Workday HCM';

-- Normalize HCM HR Workday entries in organizations
UPDATE organizations 
SET hcm_hr = 'Workday HCM'
WHERE hcm_hr ILIKE '%Workday%' AND hcm_hr != 'Workday HCM';