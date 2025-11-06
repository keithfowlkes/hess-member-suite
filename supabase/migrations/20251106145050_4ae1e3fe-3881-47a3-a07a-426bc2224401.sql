-- Allow public users to view active member organizations for the member update form
CREATE POLICY "Public can view active member organizations"
ON public.organizations
FOR SELECT
TO anon
USING (
  membership_status = 'active'::membership_status 
  AND (organization_type = 'member' OR organization_type IS NULL)
);