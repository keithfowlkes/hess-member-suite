-- Ensure System Administrator organization is excluded from member organization listings
-- Add a special organization type field to distinguish administrative organizations

-- First, add an organization_type column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS organization_type text DEFAULT 'member';

-- Update existing organizations to be 'member' type (if not already set)
UPDATE public.organizations 
SET organization_type = 'member' 
WHERE organization_type IS NULL OR organization_type = '';

-- Create or update the System Administrator organization to be 'system' type
INSERT INTO public.organizations (
  name, 
  email, 
  membership_status, 
  annual_fee_amount, 
  country,
  organization_type
) VALUES (
  'System Administrator',
  'admin@system.local', 
  'active', 
  0, 
  'United States',
  'system'
) ON CONFLICT (name) 
DO UPDATE SET 
  organization_type = 'system',
  annual_fee_amount = 0,
  membership_status = 'active';

-- Create an index for better performance when filtering by organization type
CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(organization_type);

-- Add a comment to document the purpose
COMMENT ON COLUMN public.organizations.organization_type IS 'Type of organization: member (regular member organizations) or system (administrative/system organizations)';

-- Update RLS policies to ensure system organizations are handled properly
-- The existing "Public can view active organizations for directory" policy should be updated
DROP POLICY IF EXISTS "Public can view active organizations for directory" ON public.organizations;

CREATE POLICY "Public can view active member organizations for directory" 
ON public.organizations 
FOR SELECT 
USING (
  membership_status = 'active'::membership_status 
  AND (organization_type = 'member' OR organization_type IS NULL)
);