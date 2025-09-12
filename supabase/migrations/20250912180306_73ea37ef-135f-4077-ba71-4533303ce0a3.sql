-- Create email logs table for centralized email delivery tracking
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  result_data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all email logs
CREATE POLICY "Admins can view all email logs" 
ON public.email_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.profiles p ON p.user_id = ur.user_id 
    WHERE p.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create policy for admins to insert email logs (for the system)
CREATE POLICY "System can insert email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (true);

-- Add index for better performance
CREATE INDEX idx_email_logs_type_date ON public.email_logs(email_type, sent_at);
CREATE INDEX idx_email_logs_success ON public.email_logs(success, sent_at);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient);