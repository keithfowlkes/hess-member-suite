-- Add secondary_contact_phone field to all relevant tables
ALTER TABLE public.organizations 
ADD COLUMN secondary_contact_phone text;

ALTER TABLE public.profiles 
ADD COLUMN secondary_contact_phone text;

ALTER TABLE public.pending_registrations 
ADD COLUMN secondary_contact_phone text;

ALTER TABLE public.member_registration_updates 
ADD COLUMN secondary_contact_phone text;