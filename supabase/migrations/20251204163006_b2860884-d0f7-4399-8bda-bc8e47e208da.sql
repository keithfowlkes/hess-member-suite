-- Store the encryption key in system_settings (the actual value will be pulled from the secret)
-- This allows the client-side to access the key for encryption
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'password_encryption_key',
  '', -- Will be set manually or via API
  'AES-256-GCM encryption key for password storage (base64 encoded)'
)
ON CONFLICT (setting_key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();