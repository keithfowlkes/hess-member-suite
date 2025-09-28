-- Update RLS policies for communications table to ensure proper access control

-- Drop existing policy and recreate with better conditions
DROP POLICY IF EXISTS "Admins can manage all communications" ON public.communications;

-- Create comprehensive policies for communications
CREATE POLICY "Admins can manage all communications" 
ON public.communications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- Allow organization contacts to manage their own organization's communications
CREATE POLICY "Organization contacts can manage their communications"
ON public.communications
FOR ALL
USING (
  organization_id IN (
    SELECT o.id 
    FROM public.organizations o
    JOIN public.profiles p ON p.id = o.contact_person_id
    WHERE p.user_id = auth.uid()
  )
);