-- Fix password reset template to work with the design system wrapper
UPDATE system_settings 
SET setting_value = '<p style="margin-bottom: 20px;">Dear {{user_name}},</p>

<p style="margin-bottom: 25px;">We received a request to reset your password for your HESS Consortium account.</p>

{{login_hint_section}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{reset_link}}" style="background: linear-gradient(135deg, #8B7355, #D4AF37); color: white; padding: 16px 32px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(139, 115, 85, 0.3);">Reset Your Password</a>
</div>

<div style="background: rgba(212, 175, 55, 0.1); border: 2px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 20px; margin: 25px 0;">
  <p style="font-size: 14px; line-height: 1.6; margin: 0;"><strong>Security Notice:</strong> This link will expire in {{expiry_time}}. If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
</div>

<p style="margin-top: 30px;">Best regards,<br><strong>HESS Consortium Team</strong></p>'
WHERE setting_key = 'password_reset_message';