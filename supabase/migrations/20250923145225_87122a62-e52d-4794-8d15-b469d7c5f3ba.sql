-- Create a test email template that uses the watercolor design from centralized email system
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'test_message',
  '<h2 style="color: #8B7355; font-family: Georgia, serif; font-size: 28px; margin-bottom: 20px; text-align: center;">HESS Consortium Email Test</h2>

<p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 20px;">This is a test email from the HESS Consortium email system.</p>

<div style="background: rgba(212, 175, 55, 0.1); border: 2px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 25px; margin: 25px 0;">
  <h3 style="color: #8B7355; font-family: Georgia, serif; font-size: 18px; margin: 0 0 15px 0;">Test Message</h3>
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 0;">{{test_message}}</p>
</div>

<div style="background: rgba(139, 115, 85, 0.1); border: 1px solid rgba(139, 115, 85, 0.2); border-radius: 8px; padding: 20px; margin: 20px 0;">
  <h3 style="color: #8B7355; font-family: Georgia, serif; font-size: 16px; margin: 0 0 10px 0;">System Information</h3>
  <ul style="font-family: Georgia, serif; font-size: 14px; line-height: 1.8; color: #6B5B47; margin: 0; padding-left: 20px;">
    <li><strong>Email service:</strong> {{system_info}}</li>
    <li><strong>Timestamp:</strong> {{timestamp}}</li>
    <li><strong>Test ID:</strong> {{test_id}}</li>
  </ul>
</div>

<p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 20px 0;">If you received this email, the HESS Consortium email system is working correctly.</p>

<div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 0;">Best regards,<br><strong style="color: #8B7355;">HESS Consortium Team</strong></p>
  <p style="font-family: Georgia, serif; font-size: 12px; color: #8B7355; margin: 10px 0 0 0; font-style: italic;">This is an automated test email from the HESS Consortium system.</p>
</div>',
  'Email template for system test messages with watercolor design'
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();