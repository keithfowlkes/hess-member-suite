-- Add new system fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN payment_platform text,
ADD COLUMN meal_plan_management text,
ADD COLUMN identity_management text,
ADD COLUMN door_access text,
ADD COLUMN document_management text;