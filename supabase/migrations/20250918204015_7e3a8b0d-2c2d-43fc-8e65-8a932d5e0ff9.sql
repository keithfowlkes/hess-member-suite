-- Update invoice email template to use new watercolor background design
UPDATE system_settings 
SET setting_value = '<div style="text-align: center; margin-bottom: 30px;">
  <img src="https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png" alt="HESS Consortium Logo" style="max-width: 200px; height: auto;">
</div>

<div style="margin-bottom: 30px;">
  <h2 style="color: #8B7355; font-family: Georgia, serif; font-size: 28px; margin-bottom: 20px; text-align: center;">Invoice for {{organization_name}}</h2>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 15px;">Dear {{organization_name}} team,</p>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 20px;">Please find attached your HESS Consortium membership invoice.</p>
  
  <div style="background: rgba(212, 175, 55, 0.1); border: 2px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 25px; margin: 25px 0;">
    <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #4A4A4A; margin: 0;"><strong style="color: #8B7355;">Invoice Number:</strong> {{invoice_number}}</p>
    <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #4A4A4A; margin: 5px 0;"><strong style="color: #8B7355;">Amount:</strong> ${{amount}}</p>
    <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #4A4A4A; margin: 5px 0 0 0;"><strong style="color: #8B7355;">Due Date:</strong> {{due_date}}</p>
  </div>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 15px;">Please remit payment by the due date to maintain your membership status.</p>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 15px;">Thank you for your continued participation in the HESS Consortium.</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
    <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 0;">Best regards,<br><strong style="color: #8B7355;">HESS Consortium Team</strong></p>
  </div>
</div>'
WHERE setting_key = 'invoice_email_template';

-- Update overdue reminder email template to use new watercolor background design
UPDATE system_settings 
SET setting_value = '<div style="text-align: center; margin-bottom: 30px;">
  <img src="https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png" alt="HESS Consortium Logo" style="max-width: 200px; height: auto;">
</div>

<div style="margin-bottom: 30px;">
  <h2 style="color: #D2691E; font-family: Georgia, serif; font-size: 28px; margin-bottom: 20px; text-align: center;">⚠️ Overdue Invoice Reminder</h2>
  <h3 style="color: #8B7355; font-family: Georgia, serif; font-size: 22px; margin-bottom: 20px; text-align: center;">{{organization_name}}</h3>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 15px;">Dear {{organization_name}} team,</p>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 20px;">This is a friendly reminder that your HESS Consortium membership invoice is overdue.</p>
  
  <div style="background: rgba(210, 105, 30, 0.1); border: 2px solid rgba(210, 105, 30, 0.4); border-radius: 12px; padding: 25px; margin: 25px 0;">
    <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #4A4A4A; margin: 0;"><strong style="color: #D2691E;">Invoice Number:</strong> {{invoice_number}}</p>
    <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #4A4A4A; margin: 5px 0;"><strong style="color: #D2691E;">Amount:</strong> ${{amount}}</p>
    <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.8; color: #4A4A4A; margin: 5px 0 0 0;"><strong style="color: #D2691E;">Original Due Date:</strong> {{due_date}}</p>
  </div>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 15px;">To maintain your membership status and avoid any service interruptions, please submit your payment at your earliest convenience.</p>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 15px; font-style: italic;">If you have already sent payment, please disregard this notice.</p>
  
  <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin-bottom: 15px;">Thank you for your prompt attention to this matter.</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3);">
    <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 0;">Best regards,<br><strong style="color: #8B7355;">HESS Consortium Team</strong></p>
  </div>
</div>'
WHERE setting_key = 'overdue_reminder_email_template';