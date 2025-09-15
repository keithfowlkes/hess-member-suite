-- Update all email templates to use the custom domain for HESS logo
-- This aligns with the sending domain mail.hessconsortium.app

UPDATE system_settings 
SET setting_value = REPLACE(
  setting_value,
  'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png',
  'https://mail.hessconsortium.app/assets/hess-logo.png'
)
WHERE setting_key LIKE '%template%' OR setting_key LIKE '%message%';

-- Also update any other Supabase storage references to use the custom domain
UPDATE system_settings 
SET setting_value = REPLACE(
  setting_value,
  'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/',
  'https://mail.hessconsortium.app/assets/'
)
WHERE setting_key LIKE '%template%' OR setting_key LIKE '%message%';

-- Update system_messages as well
UPDATE system_messages 
SET content = REPLACE(
  content,
  'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png',
  'https://mail.hessconsortium.app/assets/hess-logo.png'
)
WHERE is_active = true;