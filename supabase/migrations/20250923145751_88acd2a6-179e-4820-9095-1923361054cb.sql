-- Update password reset and profile update templates to use watercolor design without conflicting elements
UPDATE system_settings 
SET setting_value = '<h2 style="color: #8B7355; font-family: Georgia, serif; font-size: 28px; margin-bottom: 20px; text-align: center;">Password Reset Request</h2>

<p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 20px;">Dear {{user_name}},</p>

<p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 25px;">We received a request to reset your password for your HESS Consortium account.</p>

{{login_hint_section}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{reset_link}}" style="background: linear-gradient(135deg, #D4AF37, #F4E4BC); color: #4A4A4A; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; font-family: Georgia, serif; border: 2px solid rgba(212, 175, 55, 0.3); transition: all 0.3s ease;">Reset Your Password</a>
</div>

<div style="background: rgba(212, 175, 55, 0.1); border: 2px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 20px; margin: 25px 0;">
  <p style="font-family: Georgia, serif; font-size: 14px; line-height: 1.6; color: #6B5B47; margin: 0;"><strong>Security Notice:</strong> This link will expire in {{expiry_time}}. If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
</div>

<div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 0;">Best regards,<br><strong style="color: #8B7355;">HESS Consortium Team</strong></p>
</div>'
WHERE setting_key = 'password_reset_message';

UPDATE system_settings 
SET setting_value = '<h2 style="color: #8B7355; font-family: Georgia, serif; font-size: 28px; margin-bottom: 20px; text-align: center;">Profile Update Approved</h2>

<p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 20px;">Dear {{first_name}} {{last_name}},</p>

<p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 20px;">Your organization information has been successfully updated in our system. You can now log in with your credentials in the <a href="https://www.hessconsortium.org/new/hess-member-information-portal/" style="color: #8B7355; font-weight: bold;">HESS Member Portal</a>.</p>

<div style="background: rgba(212, 175, 55, 0.1); border: 2px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 25px; margin: 25px 0;">
  <h3 style="color: #8B7355; font-family: Georgia, serif; font-size: 18px; margin: 0 0 15px 0;">Updated Information:</h3>
  <div style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A;">{{update_details}}</div>
</div>

<p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 20px 0;">If you have any questions about these changes, please contact us at <a href="mailto:info@hessconsortium.org" style="color: #8B7355; font-weight: bold;">info@hessconsortium.org</a>.</p>

<div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 0;">Best regards,<br><strong style="color: #8B7355;">HESS Consortium Team</strong></p>
</div>'
WHERE setting_key = 'profile_update_message_template';