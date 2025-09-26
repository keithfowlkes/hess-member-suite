-- Add default email template for organization update alerts
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'organization_update_alert_template', 
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: {{text_color}};">
    <h2 style="color: {{primary_color}}; margin-bottom: 20px;">Organization Update Alert</h2>
    
    <p>Dear {{user_name}},</p>
    
    <p>We wanted to inform you that a membership update has been submitted for your organization, <strong>{{organization_name}}</strong>.</p>
    
    <div style="background-color: {{card_background}}; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid {{primary_color}};">
      <p><strong>Submitted by:</strong> {{submitted_email}}</p>
      <p><strong>Organization:</strong> {{organization_name}}</p>
      <p><strong>Status:</strong> Pending administrative review</p>
    </div>
    
    <p style="color: #d32f2f; font-weight: bold; background-color: #ffeaea; padding: 15px; border-radius: 5px;">
      ⚠️ <strong>Important:</strong> If you did not authorize this update or believe this submission is unauthorized, please contact us immediately at {{contact_email}} within {{deadline_hours}} hours.
    </p>
    
    <p>This update will be reviewed by our administrative team before any changes are applied to your organization''s record.</p>
    
    <p>If you have any questions or concerns, please don''t hesitate to contact us.</p>
    
    <p>Best regards,<br>
    <span style="color: {{primary_color}};">HESS Consortium Team</span></p>
  </div>',
  'Email template for alerting organization owners when membership updates are submitted'
) ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;