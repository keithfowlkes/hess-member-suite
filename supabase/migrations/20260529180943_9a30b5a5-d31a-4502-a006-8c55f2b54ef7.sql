-- Allow members (and the public) to read only the stripe_enabled flag so the
-- Member Dashboard can decide whether to render the "Pay with card" button.
-- All other stripe_* keys (secret keys, webhook secrets, etc.) remain
-- restricted to admins by the existing "Admins can manage system settings"
-- policy.
CREATE POLICY "Public can view stripe enabled flag"
ON public.system_settings
FOR SELECT
USING (setting_key = 'stripe_enabled');