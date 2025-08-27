-- Allow public read access to reCAPTCHA site key for registration form
CREATE POLICY "Public can view recaptcha site key" 
ON public.system_settings 
FOR SELECT 
TO public 
USING (setting_key = 'recaptcha_site_key');