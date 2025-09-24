-- Update password reset template to use design system color variables
UPDATE system_settings 
SET setting_value = '<p style="margin-bottom: 20px;">Dear {{user_name}},</p>

<p style="margin-bottom: 25px;">We received a request to reset your password for your HESS Consortium account.</p>

{{login_hint_section}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{reset_link}}" style="background: linear-gradient(135deg, {{primary_color}}, {{accent_color}}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(139, 115, 85, 0.3);">Reset Your Password</a>
</div>

<div style="background: {{accent_color}}20; border: 2px solid {{accent_color}}50; border-radius: 12px; padding: 20px; margin: 25px 0;">
  <p style="font-size: 14px; line-height: 1.6; margin: 0; color: {{text_color}};"><strong>Security Notice:</strong> This link will expire in {{expiry_time}}. If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
</div>

<p style="margin-top: 30px; color: {{text_color}};">Best regards,<br><strong style="color: {{primary_color}};">HESS Consortium Team</strong></p>'
WHERE setting_key = 'password_reset_message';