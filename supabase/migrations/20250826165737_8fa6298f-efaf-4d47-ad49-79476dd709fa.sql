-- Get current user ID and assign admin role
INSERT INTO user_roles (user_id, role) 
SELECT auth.uid(), 'admin'::app_role
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;