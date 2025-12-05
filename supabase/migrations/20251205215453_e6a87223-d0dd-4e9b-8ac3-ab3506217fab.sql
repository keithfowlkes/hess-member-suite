-- Clear plaintext passwords from pending_registrations
-- These are either approved (user already has account) or rejected (no longer needed)
UPDATE pending_registrations
SET password_hash = '[CLEARED - User account created or registration rejected]'
WHERE password_hash NOT LIKE 'encrypted:%' 
  AND password_hash IS NOT NULL 
  AND password_hash != ''
  AND (approval_status = 'approved' OR approval_status = 'rejected');

-- Clear password field from registration_data JSON in member_registration_updates
-- These passwords are no longer needed after approval/rejection
UPDATE member_registration_updates
SET registration_data = registration_data - 'password'
WHERE registration_data->>'password' IS NOT NULL 
  AND registration_data->>'password' != '';