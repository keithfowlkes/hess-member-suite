-- Update the profile_update_message_template to use Supabase storage URLs instead of external domain URLs
UPDATE system_settings 
SET setting_value = REPLACE(
  REPLACE(
    setting_value,
    'http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png',
    'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png'
  ),
  'https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png',
  'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png'
)
WHERE setting_key = 'profile_update_message_template';

-- Update any other templates that might contain external image URLs
UPDATE system_settings 
SET setting_value = REPLACE(
  REPLACE(
    setting_value,
    'http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png',
    'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png'
  ),
  'https://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png',
  'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png'
)
WHERE setting_key LIKE '%template%' OR setting_key LIKE '%message%';

-- Update any system_messages that might contain external image URLs
UPDATE system_messages 
SET content = REPLACE(
  REPLACE(
    content,
    'http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png',
    'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png'
  ),
  'https://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png',
  'https://tyovnvuluyosjnabrzjc.supabase.co/storage/v1/object/public/invoice-logos/4a98a7dc-4bad-4f5b-94d4-fa028adbc2f6.png'
)
WHERE is_active = true;