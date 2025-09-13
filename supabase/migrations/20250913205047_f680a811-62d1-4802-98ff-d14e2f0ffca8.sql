-- Add system setting for email rate limiting delay
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES ('email_rate_limit_delay_ms', '550', 'Delay in milliseconds between bulk email sends to respect Resend API rate limits (2 req/sec max)')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;