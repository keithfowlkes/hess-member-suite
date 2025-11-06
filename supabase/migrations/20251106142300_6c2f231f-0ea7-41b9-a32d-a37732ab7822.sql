-- Restrict public access to organizations table to only show non-sensitive fields
-- Remove the broad public access policy and replace with field-specific access

DROP POLICY IF EXISTS "Public can view active member organizations for directory" ON public.organizations;

-- Create a view for public directory that only exposes non-sensitive information
CREATE OR REPLACE VIEW public.public_organization_directory AS
SELECT 
  id,
  name,
  city,
  state,
  website,
  membership_status,
  organization_type,
  student_fte,
  -- System fields for benchmarking (no personal contact info)
  student_information_system,
  financial_system,
  financial_aid,
  hcm_hr,
  payroll_system,
  purchasing_system,
  housing_management,
  learning_management,
  admissions_crm,
  alumni_advancement_crm,
  payment_platform,
  meal_plan_management,
  identity_management,
  door_access,
  document_management,
  voip,
  network_infrastructure,
  primary_office_apple,
  primary_office_lenovo,
  primary_office_dell,
  primary_office_hp,
  primary_office_microsoft,
  primary_office_other
FROM public.organizations
WHERE membership_status = 'active' 
  AND (organization_type = 'member' OR organization_type IS NULL);

-- Grant public access to the view only
GRANT SELECT ON public.public_organization_directory TO anon;
GRANT SELECT ON public.public_organization_directory TO authenticated;

-- Authenticated members can still view full details for collaboration
CREATE POLICY "Authenticated members can view active organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL));