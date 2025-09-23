-- Update the test email template key to match centralized system expectations
UPDATE system_settings 
SET setting_key = 'test_message_template'
WHERE setting_key = 'test_message';