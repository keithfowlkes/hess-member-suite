-- Add system setting for member information update email template
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'email_member_info_update_template',
  'Dear {{first_name}} {{last_name}},

Your organization information has been successfully updated in our system.

**Updated Information:**
{{update_details}}

If you have any questions about these changes, please contact us.

Best regards,
The Administration Team',
  'Email template for member information update notifications'
) ON CONFLICT (setting_key) DO NOTHING;