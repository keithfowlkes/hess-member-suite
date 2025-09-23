-- Create email design settings for centralized template control
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('email_design_template', 'modern_block', 'Selected email design template type'),
('email_background_image', '', 'URL of the background image for email templates'),
('email_design_primary_color', '#8B7355', 'Primary color for email design elements'),
('email_design_accent_color', '#D4AF37', 'Accent color for email design elements'),
('email_design_text_color', '#4A4A4A', 'Primary text color for email templates'),
('email_design_card_background', 'rgba(248, 245, 238, 0.95)', 'Background color for email content cards')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();