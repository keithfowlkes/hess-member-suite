-- Add system setting for the correct app URL
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'app_base_url', 
  'https://9f0afb12-d741-415b-9bbb-e40cfcba281a.sandbox.lovable.dev', 
  'Base URL for the application used in password reset links'
) ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();