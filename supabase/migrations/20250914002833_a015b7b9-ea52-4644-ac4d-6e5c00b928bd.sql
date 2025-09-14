-- Assign member role to the user
INSERT INTO public.user_roles (user_id, role)
VALUES ('5cdb96c0-3ecb-4a92-9e9d-e5f161b73c2e', 'member'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;