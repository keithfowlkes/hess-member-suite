-- Add index on organizations.contact_person_id for faster joins
CREATE INDEX IF NOT EXISTS idx_organizations_contact_person 
ON public.organizations(contact_person_id) 
WHERE contact_person_id IS NOT NULL;

-- Add index on membership_status for filtering
CREATE INDEX IF NOT EXISTS idx_organizations_membership_status 
ON public.organizations(membership_status);