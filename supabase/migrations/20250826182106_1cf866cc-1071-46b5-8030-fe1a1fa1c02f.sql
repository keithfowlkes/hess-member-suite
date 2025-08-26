-- Create system_settings table for storing configuration
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage system settings
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default password reset message
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'password_reset_message',
  'A password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password.',
  'Default message shown when password reset is initiated'
);