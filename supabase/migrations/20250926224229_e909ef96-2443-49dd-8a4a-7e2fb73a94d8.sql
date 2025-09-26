-- Add new system fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN payment_platform text,
ADD COLUMN meal_plan_management text,
ADD COLUMN identity_management text,
ADD COLUMN door_access text,
ADD COLUMN document_management text;