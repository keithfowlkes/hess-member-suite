-- Delete old CAMS variations from system_field_options (keeping only 'Unit4')
DELETE FROM system_field_options 
WHERE field_name = 'hcm_hr'
  AND option_value ILIKE '%CAMS%'
  AND option_value != 'Unit4';

-- Normalize hcm_hr CAMS entries in organizations
UPDATE organizations 
SET hcm_hr = 'Unit4'
WHERE hcm_hr ILIKE '%CAMS%'
  AND hcm_hr != 'Unit4';