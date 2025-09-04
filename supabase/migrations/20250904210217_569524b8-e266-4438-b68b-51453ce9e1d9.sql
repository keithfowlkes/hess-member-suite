-- Clean up keith.fowlkes@higheredcommunities.org account completely
-- Step 1: Remove as contact person from organizations
UPDATE organizations 
SET contact_person_id = NULL 
WHERE contact_person_id = 'ae011db5-bcff-472b-b439-e8a5b4e1ce74';

-- Step 2: Delete user roles
DELETE FROM user_roles 
WHERE user_id = '5cdb96c0-3ecb-4a92-9e9d-e5f161b73c2e';

-- Step 3: Delete profile
DELETE FROM profiles 
WHERE user_id = '5cdb96c0-3ecb-4a92-9e9d-e5f161b73c2e';

-- Add audit log entry
INSERT INTO audit_log (action, entity_type, entity_id, details)
VALUES (
  'user_deleted',
  'user', 
  '5cdb96c0-3ecb-4a92-9e9d-e5f161b73c2e',
  '{"email": "keith.fowlkes@higheredcommunities.org", "deleted_by": "admin_manual_cleanup", "reason": "Complete account deletion requested"}'::jsonb
);