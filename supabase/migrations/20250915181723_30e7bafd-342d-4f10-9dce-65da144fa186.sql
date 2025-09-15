-- Set the HESS Consortium logo URL for email delivery and public display
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'public_logo_url', 
  'https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png',
  'URL for the public logo display and email templates'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = 'https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png',
  updated_at = now();

-- Set the HESS Consortium logo name
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'public_logo_name', 
  'HESS Consortium Logo',
  'Display name for the public logo'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = 'HESS Consortium Logo',
  updated_at = now();