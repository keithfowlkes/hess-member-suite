UPDATE system_settings 
SET setting_value = 'https://members.hessconsortium.app/password-reset' 
WHERE setting_key = 'password_reset_redirect_url';