-- Update the app base URL to use the correct domain
UPDATE system_settings 
SET setting_value = 'https://members.hessconsortium.app',
    updated_at = now()
WHERE setting_key = 'app_base_url';

-- Ensure we have the correct redirect URL setting
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'password_reset_redirect_url', 
  'https://members.hessconsortium.app/auth?reset=true', 
  'Redirect URL for password reset emails'
) ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();