-- Create the one-to-many relationship: organizations -> many users
-- First, add organization_id to profiles table
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Migrate existing data: set organization_id based on current contact_person_id
UPDATE public.profiles 
SET organization_id = organizations.id
FROM public.organizations 
WHERE organizations.contact_person_id = profiles.id;

-- Create index for better performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);

-- Now remove the contact_person_id from organizations since we have the reverse relationship
ALTER TABLE public.organizations DROP COLUMN contact_person_id;

-- Add a primary contact flag to profiles to identify the main contact for each organization
ALTER TABLE public.profiles ADD COLUMN is_primary_contact BOOLEAN DEFAULT FALSE;

-- Set the migrated profiles as primary contacts
UPDATE public.profiles 
SET is_primary_contact = TRUE 
WHERE organization_id IS NOT NULL;