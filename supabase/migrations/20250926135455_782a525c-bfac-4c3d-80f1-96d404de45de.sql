-- Add the send-admin-notification function configuration and default notification emails setting
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'notification_emails', 
  '["keith.fowlkes@hessconsortium.org"]',
  'Email addresses to notify when new registrations or updates are pending review'
) ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- Add email template for admin notifications
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'admin_notification_template', 
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
    <h2 style="color: {{primary_color}}; margin-bottom: 20px;">{{notification_title}}</h2>
    
    <p>Dear {{user_name}},</p>
    
    <p>{{notification_message}}</p>
    
    <div style="background-color: {{card_background}}; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid {{primary_color}};">
      <p><strong>Organization:</strong> {{organization_name}}</p>
      <p><strong>Contact:</strong> {{submitted_email}}</p>
      <p><strong>Type:</strong> {{notification_type}}</p>
      <p><strong>Status:</strong> Pending Review</p>
    </div>
    
    <p>Please log in to the admin panel to review and take appropriate action.</p>
    
    <p>Best regards,<br>
    <span style="color: {{primary_color}};">HESS Consortium System</span></p>
  </div>',
  'Email template for admin notifications about pending reviews'
) ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;