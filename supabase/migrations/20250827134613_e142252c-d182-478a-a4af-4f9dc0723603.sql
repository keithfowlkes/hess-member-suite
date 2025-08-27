-- Add RLS policy to allow organization members to update their organization
CREATE POLICY "Organization members can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (
  id = get_user_organization_by_contact(auth.uid())
);