-- Add login_hint field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN login_hint text;