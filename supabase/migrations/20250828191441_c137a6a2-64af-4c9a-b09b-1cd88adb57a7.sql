-- Drop the conflicting ALL policy
DROP POLICY "Admins can manage all reassignment requests" ON public.organization_reassignment_requests;

-- Create specific policies for admins that don't conflict with anonymous INSERT
CREATE POLICY "Admins can view all reassignment requests" 
ON public.organization_reassignment_requests 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reassignment requests" 
ON public.organization_reassignment_requests 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reassignment requests" 
ON public.organization_reassignment_requests 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));