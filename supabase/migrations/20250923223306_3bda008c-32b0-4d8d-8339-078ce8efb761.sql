-- Add cohort_leader role to current test user for testing the cohort functionality
INSERT INTO user_roles (user_id, role) 
SELECT id, 'cohort_leader'::app_role 
FROM auth.users 
WHERE email = 'bmiller@belhaven.edu' 
AND NOT EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.users.id 
  AND role = 'cohort_leader'::app_role
);