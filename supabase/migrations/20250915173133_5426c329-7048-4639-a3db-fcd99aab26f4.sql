-- Update all email templates to use members.hessconsortium.app domain for HESS logo
-- This makes the logo accessible from the main application domain

UPDATE system_settings 
SET setting_value = REPLACE(
  setting_value,
  'https://mail.hessconsortium.app/assets/hess-logo.png',
  'https://members.hessconsortium.app/assets/hess-logo.png'
)
WHERE setting_key LIKE '%template%' OR setting_key LIKE '%message%';

-- Update system_messages as well
UPDATE system_messages 
SET content = REPLACE(
  content,
  'https://mail.hessconsortium.app/assets/hess-logo.png',
  'https://members.hessconsortium.app/assets/hess-logo.png'
)
WHERE is_active = true;