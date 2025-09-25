-- Insert the unauthorized update warning email template into system_messages
INSERT INTO system_messages (
    email_type,
    title,
    content,
    is_active,
    priority
) VALUES (
    'unauthorized_update_warning',
    'URGENT: Unauthorized Organization Update Alert - Action Required',
    '<h2>URGENT: Organization Update Alert</h2>
    
    <p>Dear Primary Contact,</p>
    
    <p><strong>An organization member update request has been submitted for {{organization_name}}.</strong></p>
    
    <p><strong>Request Details:</strong><br>
    • Submitted by: {{primary_contact_name}}<br>
    • Email address: {{submitted_email}}<br>
    • Organization: {{organization_name}}</p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0; font-weight: bold; color: #dc2626;">⚠️ IMMEDIATE ACTION REQUIRED</p>
        <p style="margin: 8px 0 0 0;">If you did NOT authorize this organization update request, please email <strong>{{contact_email}}</strong> immediately within the next 24 hours to report this as an unauthorized request.</p>
    </div>
    
    <p>If you did authorize this request, no action is needed. Our administrative team will review and process the update accordingly.</p>
    
    <p>Thank you for helping us maintain the security and accuracy of our member database.</p>
    
    <p>Best regards,<br>
    HESS Consortium Administration</p>',
    true,
    'high'
);

-- Also add it to system_settings for template configuration
INSERT INTO system_settings (
    setting_key,
    setting_value,
    description
) VALUES (
    'email_template_unauthorized_update_warning',
    '<h2>URGENT: Organization Update Alert</h2>
    
    <p>Dear Primary Contact,</p>
    
    <p><strong>An organization member update request has been submitted for {{organization_name}}.</strong></p>
    
    <p><strong>Request Details:</strong><br>
    • Submitted by: {{primary_contact_name}}<br>
    • Email address: {{submitted_email}}<br>
    • Organization: {{organization_name}}</p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0; font-weight: bold; color: #dc2626;">⚠️ IMMEDIATE ACTION REQUIRED</p>
        <p style="margin: 8px 0 0 0;">If you did NOT authorize this organization update request, please email <strong>{{contact_email}}</strong> immediately within the next 24 hours to report this as an unauthorized request.</p>
    </div>
    
    <p>If you did authorize this request, no action is needed. Our administrative team will review and process the update accordingly.</p>
    
    <p>Thank you for helping us maintain the security and accuracy of our member database.</p>
    
    <p>Best regards,<br>
    HESS Consortium Administration</p>',
    'Email template for unauthorized organization update warnings'
);