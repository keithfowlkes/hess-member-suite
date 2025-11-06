-- Fix organization_reassignment_requests table security
-- Remove dangerous bypass policies that allow unrestricted access

DROP POLICY IF EXISTS "bypass_delete" ON public.organization_reassignment_requests;
DROP POLICY IF EXISTS "bypass_insert" ON public.organization_reassignment_requests;
DROP POLICY IF EXISTS "bypass_select" ON public.organization_reassignment_requests;
DROP POLICY IF EXISTS "bypass_update" ON public.organization_reassignment_requests;

-- Create proper RLS policies with appropriate access controls

-- Admins can view all reassignment requests
CREATE POLICY "Admins can view all reassignment requests"
ON public.organization_reassignment_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own reassignment requests (based on email)
CREATE POLICY "Users can view their own reassignment requests"
ON public.organization_reassignment_requests
FOR SELECT
TO authenticated
USING (
  new_contact_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  OR user_registration_data->>'email' = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
);

-- Authenticated users can create reassignment requests
CREATE POLICY "Authenticated users can create reassignment requests"
ON public.organization_reassignment_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can update reassignment requests (for approval/rejection)
CREATE POLICY "Admins can update reassignment requests"
ON public.organization_reassignment_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete reassignment requests
CREATE POLICY "Admins can delete reassignment requests"
ON public.organization_reassignment_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));