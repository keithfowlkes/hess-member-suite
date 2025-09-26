-- Add new system fields to pending_registrations table
ALTER TABLE public.pending_registrations 
ADD COLUMN payment_platform text,
ADD COLUMN meal_plan_management text,
ADD COLUMN identity_management text,
ADD COLUMN door_access text,
ADD COLUMN document_management text;