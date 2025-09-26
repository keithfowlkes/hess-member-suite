-- Add approximate_date_joined_hess field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN approximate_date_joined_hess date;

-- Add the same field to member_registration_updates table for form submissions
ALTER TABLE public.member_registration_updates 
ADD COLUMN approximate_date_joined_hess text;

-- Add the field to pending_registrations table as well
ALTER TABLE public.pending_registrations 
ADD COLUMN approximate_date_joined_hess text;