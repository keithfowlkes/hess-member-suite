-- First, drop the RLS policies that depend on contact_person_id
DROP POLICY IF EXISTS "Members can view own organization v2" ON public.organizations;
DROP POLICY IF EXISTS "Members can update own organization v2" ON public.organizations;

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

-- Add a primary contact flag to profiles to identify the main contact for each organization
ALTER TABLE public.profiles ADD COLUMN is_primary_contact BOOLEAN DEFAULT FALSE;

-- Set the migrated profiles as primary contacts
UPDATE public.profiles 
SET is_primary_contact = TRUE 
WHERE organization_id IS NOT NULL;

-- Now remove the contact_person_id from organizations
ALTER TABLE public.organizations DROP COLUMN contact_person_id;

-- Recreate RLS policies with new relationship structure
-- Members can view organizations they belong to
CREATE POLICY "Members can view their organization" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Members can update organizations they belong to (if they are primary contact)
CREATE POLICY "Primary contacts can update their organization" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() AND is_primary_contact = TRUE
  )
);

-- Admins can view and update all organizations
CREATE POLICY "Admins can view all organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all organizations" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete organizations" 
ON public.organizations 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));