-- Add organization-centric fields and improve the relationship model
-- First, let's add missing organizational fields to the organizations table that are currently in profiles

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS primary_contact_title text,
ADD COLUMN IF NOT EXISTS secondary_first_name text,
ADD COLUMN IF NOT EXISTS secondary_last_name text,
ADD COLUMN IF NOT EXISTS secondary_contact_title text,
ADD COLUMN IF NOT EXISTS secondary_contact_email text,
ADD COLUMN IF NOT EXISTS student_information_system text,
ADD COLUMN IF NOT EXISTS financial_system text,
ADD COLUMN IF NOT EXISTS financial_aid text,
ADD COLUMN IF NOT EXISTS hcm_hr text,
ADD COLUMN IF NOT EXISTS payroll_system text,
ADD COLUMN IF NOT EXISTS purchasing_system text,
ADD COLUMN IF NOT EXISTS housing_management text,
ADD COLUMN IF NOT EXISTS learning_management text,
ADD COLUMN IF NOT EXISTS admissions_crm text,
ADD COLUMN IF NOT EXISTS alumni_advancement_crm text,
ADD COLUMN IF NOT EXISTS primary_office_apple boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_office_asus boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_office_dell boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_office_hp boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_office_microsoft boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_office_other boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_office_other_details text,
ADD COLUMN IF NOT EXISTS other_software_comments text;

-- Create a function to get the organization for a user
CREATE OR REPLACE FUNCTION public.get_user_organization_by_contact(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.id
  FROM public.organizations o
  JOIN public.profiles p ON p.id = o.contact_person_id
  WHERE p.user_id = _user_id
$function$;

-- Update RLS policies for organization-centric model
DROP POLICY IF EXISTS "Members can update own organization" ON public.organizations;
DROP POLICY IF EXISTS "Members can view own organization" ON public.organizations;

-- Allow primary contacts to view and update their organization
CREATE POLICY "Primary contacts can view their organization" 
ON public.organizations 
FOR SELECT 
USING (contact_person_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Primary contacts can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (contact_person_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Create a function to sync profile organization name with organization table
CREATE OR REPLACE FUNCTION public.sync_profile_organization_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When an organization name is updated, update the profile organization field for the contact person
  IF OLD.name IS DISTINCT FROM NEW.name AND NEW.contact_person_id IS NOT NULL THEN
    UPDATE profiles 
    SET organization = NEW.name,
        updated_at = now()
    WHERE id = NEW.contact_person_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to sync organization name changes
DROP TRIGGER IF EXISTS sync_organization_name ON public.organizations;
CREATE TRIGGER sync_organization_name
  AFTER UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_organization_name();