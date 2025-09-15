-- Fix the email_member_info_update_template that still contains base64 image
UPDATE system_settings 
SET setting_value = REPLACE(
  setting_value,
  SUBSTRING(setting_value FROM 'src="data:image/png;base64,[^"]*'),
  'src="https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png"'
)
WHERE setting_key = 'email_member_info_update_template' AND setting_value LIKE '%data:image/png;base64%';

-- Also update any other templates that might still have base64 images
UPDATE system_settings 
SET setting_value = REPLACE(
  setting_value,
  SUBSTRING(setting_value FROM 'src="data:image/[^;]*;base64,[^"]*'),
  'src="https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png"'
)
WHERE setting_value LIKE '%data:image/%base64%';

-- Fix any remaining external hessconsortium.org image references
UPDATE system_settings 
SET setting_value = REPLACE(
  REPLACE(
    setting_value,
    'https://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png',
    'https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png'
  ),
  'http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png',
  'https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png'
)
WHERE setting_value LIKE '%hessconsortium.org%wp-content%';