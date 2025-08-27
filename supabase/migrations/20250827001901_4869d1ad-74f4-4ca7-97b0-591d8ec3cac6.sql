-- Ensure keith.fowlkes@hessconsortium.org has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE p.email = 'keith.fowlkes@hessconsortium.org'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the admin role was assigned
SELECT ur.role, p.email 
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.user_id
WHERE p.email = 'keith.fowlkes@hessconsortium.org';