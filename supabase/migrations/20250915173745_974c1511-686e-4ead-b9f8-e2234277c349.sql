-- Update all email templates to use the working staging domain URL for HESS logo
-- This ensures emails work while custom domain asset serving is fixed

UPDATE system_settings 
SET setting_value = REPLACE(
  setting_value,
  'https://members.hessconsortium.app/assets/hess-logo.png',
  'https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png'
)
WHERE setting_key LIKE '%template%' OR setting_key LIKE '%message%';

-- Update system_messages as well
UPDATE system_messages 
SET content = REPLACE(
  content,
  'https://members.hessconsortium.app/assets/hess-logo.png',
  'https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png'
)
WHERE is_active = true;