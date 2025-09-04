-- Add missing user role for keith.fowlkes@higheredcommunities.org
INSERT INTO user_roles (user_id, role)
VALUES ('5cdb96c0-3ecb-4a92-9e9d-e5f161b73c2e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Check for other users with profiles but no roles
SELECT p.user_id, p.email, p.first_name, p.last_name
FROM profiles p 
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE ur.user_id IS NULL;