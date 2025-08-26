-- Rollback migration: Restore original organization-user relationship

-- First, drop ALL existing RLS policies on organizations to avoid conflicts
DROP POLICY IF EXISTS "Members can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Primary contacts can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can manage all organizations v2" ON public.organizations;
DROP POLICY IF EXISTS "Members can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Members can update own organization" ON public.organizations;
DROP POLICY IF EXISTS "Members can view own organization v2" ON public.organizations;
DROP POLICY IF EXISTS "Members can update own organization v2" ON public.organizations;
DROP POLICY IF EXISTS "Public can view active organizations for directory" ON public.organizations;

-- Add back the contact_person_id column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contact_person_id UUID REFERENCES public.profiles(id);

-- Migrate data back: set contact_person_id based on profiles with is_primary_contact = true
UPDATE public.organizations 
SET contact_person_id = profiles.id
FROM public.profiles 
WHERE profiles.organization_id = organizations.id 
  AND profiles.is_primary_contact = TRUE;

-- Remove the columns that were added during the one-to-many migration
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_primary_contact;

-- Drop the index that was created
DROP INDEX IF EXISTS idx_profiles_organization_id;

-- Recreate the original RLS policies with clean names
CREATE POLICY "Members can view own organization" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (contact_person_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Members can update own organization" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING (contact_person_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage all organizations" 
ON public.organizations 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep the public directory policy
CREATE POLICY "Public can view active organizations for directory" 
ON public.organizations 
FOR SELECT 
USING (membership_status = 'active'::membership_status);