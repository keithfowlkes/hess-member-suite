-- Check if there are any auth users for the approved emails by looking at user roles
SELECT ur.user_id, ur.role, p.email 
FROM user_roles ur 
LEFT JOIN profiles p ON p.user_id = ur.user_id 
WHERE p.email IN ('u@deuslogic.com', 'jkfowlkes@gmail.com')
UNION ALL
-- Also check for any profiles that might exist without being shown
SELECT NULL as user_id, NULL as role, email 
FROM profiles 
WHERE email IN ('u@deuslogic.com', 'jkfowlkes@gmail.com');