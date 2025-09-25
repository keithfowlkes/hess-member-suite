-- Fix email templates to use dynamic color placeholders instead of hardcoded colors

-- Update invoice_email_template
UPDATE system_settings 
SET setting_value = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(
                      REPLACE(setting_value, '#8B7355', '{{primary_color}}'),
                      '#4A4A4A', '{{text_color}}'
                    ),
                    'rgba(212, 175, 55, 0.1)', '{{accent_color}}20'
                  ),
                  'rgba(212, 175, 55, 0.3)', '{{accent_color}}50'  
                ),
                'color: #D4AF37', 'color: {{accent_color}}'
              ),
              'background-color: #D4AF37', 'background-color: {{accent_color}}'
            ),
            'rgba(248, 245, 238, 0.95)', '{{card_background}}'
          ),
          'border: 2px solid rgba(212, 175, 55, 0.3)', 'border: 2px solid {{accent_color}}50'
        ),
        'border-top: 2px solid rgba(212, 175, 55, 0.3)', 'border-top: 2px solid {{accent_color}}50'
      ),
      'background: rgba(212, 175, 55, 0.1)', 'background: {{accent_color}}20'
    ),
    'rgba(139, 115, 85, 0.3)', '{{primary_color}}50'
  ),
  'color: rgb(139, 115, 85)', 'color: {{primary_color}}'
)
WHERE setting_key IN (
  'invoice_email_template', 
  'welcome_message_template', 
  'password_reset_message', 
  'email_member_info_update_template', 
  'organization_invitation_template', 
  'overdue_reminder_email_template'
);

-- Additional color pattern replacements for completeness
UPDATE system_settings 
SET setting_value = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(setting_value, 'rgb(139, 115, 85)', '{{primary_color}}'),
          'rgb(74, 74, 74)', '{{text_color}}'
        ),
        'rgb(212, 175, 55)', '{{accent_color}}'
      ),
      '#c6bc76', '{{accent_color}}'
    ),
    '#9d8161', '{{primary_color}}'
  ),
  'rgba(74, 74, 74, 0.8)', '{{text_color}}CC'
)
WHERE setting_key IN (
  'invoice_email_template', 
  'welcome_message_template', 
  'password_reset_message', 
  'email_member_info_update_template', 
  'organization_invitation_template', 
  'overdue_reminder_email_template'
);