-- Update the reCAPTCHA site key to the correct value
UPDATE system_settings 
SET setting_value = '6LcrvLQrAAAAACqi-ToVoiEIOGgqCfy7vtUVhJ_h', 
    updated_at = now()
WHERE setting_key = 'recaptcha_site_key';