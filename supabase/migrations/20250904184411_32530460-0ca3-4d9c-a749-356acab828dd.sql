-- Add member role for the other user without roles
INSERT INTO user_roles (user_id, role)
VALUES ('ae1f2cc8-d0a7-421d-8f1b-4900d2523841', 'member')
ON CONFLICT (user_id, role) DO NOTHING;