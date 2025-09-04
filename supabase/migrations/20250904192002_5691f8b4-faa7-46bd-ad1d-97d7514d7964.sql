-- Add login_hint field to pending_registrations table
ALTER TABLE public.pending_registrations 
ADD COLUMN login_hint text;