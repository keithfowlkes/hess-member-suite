-- Fix the password_reset_message template that still contains base64 image
UPDATE system_settings 
SET setting_value = REPLACE(
  setting_value,
  SUBSTRING(setting_value FROM 'src="data:image/png;base64,[^"]*'),
  'src="https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png"'
)
WHERE setting_key = 'password_reset_message' AND setting_value LIKE '%data:image/png;base64%';