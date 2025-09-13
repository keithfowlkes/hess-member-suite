-- Update the password_reset email template with proper button styling
UPDATE system_messages 
SET content = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <center>
    <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px; margin-bottom: 30px;">
  </center>
  
  <h2 style="color: #333333; font-size: 24px; margin-bottom: 20px;">Password Reset Request</h2>
  
  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hello {{user_name}},</p>
  
  <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
    We received a request to reset your password for your HESS Consortium account. Click the button below to reset your password:
  </p>
  
  <div style="text-align: center; margin: 40px 0;">
    <a href="{{reset_link}}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
      Reset Password
    </a>
  </div>
  
  <p style="color: #888888; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
    This password reset link will expire in {{expiry_time}}. If you did not request this password reset, please ignore this email.
  </p>
  
  {{login_hint_section}}
  
  <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px;">
    <p style="color: #888888; font-size: 12px; line-height: 1.6;">
      If you are having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:<br>
      <a href="{{reset_link}}" style="color: #2563eb; word-break: break-all;">{{reset_link}}</a>
    </p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">Best regards,</p>
    <p style="color: #666666; font-size: 14px; margin: 0;">
      Keith Fowlkes, M.A., M.B.A.<br>
      Executive Director and Founder<br>
      The HESS Consortium<br>
      keith.fowlkes@hessconsortium.org | 859.516.3571
    </p>
  </div>
</div>
'
WHERE email_type = 'password_reset';