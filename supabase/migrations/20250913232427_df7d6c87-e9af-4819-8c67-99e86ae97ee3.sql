-- Insert default email templates for invoice and overdue reminder types
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'invoice_email_template',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    <center>
      <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
    </center>
    <div style="margin-top: 20px;">
      <h2>Invoice for {{organization_name}}</h2>
      <p>Dear {{organization_name}} team,</p>
      <p>Please find attached your HESS Consortium membership invoice.</p>
      <p><strong>Invoice Number:</strong> {{invoice_number}}<br>
         <strong>Amount:</strong> ${{amount}}<br>
         <strong>Due Date:</strong> {{due_date}}</p>
      <p>Please remit payment by the due date to maintain your membership status.</p>
      <p>Thank you for your continued participation in the HESS Consortium.</p>
      <p>Best regards,<br>HESS Consortium Team</p>
    </div>
  </div>',
  'Email template for invoice notifications'
) ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'overdue_reminder_email_template',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    <center>
      <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
    </center>
    <div style="margin-top: 20px;">
      <h2>Overdue Invoice Reminder - {{organization_name}}</h2>
      <p>Dear {{organization_name}} team,</p>
      <p>This is a friendly reminder that your HESS Consortium membership invoice is overdue.</p>
      <p><strong>Invoice Number:</strong> {{invoice_number}}<br>
         <strong>Amount:</strong> ${{amount}}<br>
         <strong>Original Due Date:</strong> {{due_date}}</p>
      <p>To maintain your membership status and avoid any service interruptions, please submit your payment at your earliest convenience.</p>
      <p>If you have already sent payment, please disregard this notice.</p>
      <p>Thank you for your prompt attention to this matter.</p>
      <p>Best regards,<br>HESS Consortium Team</p>
    </div>
  </div>',
  'Email template for overdue invoice reminders'
) ON CONFLICT (setting_key) DO NOTHING;