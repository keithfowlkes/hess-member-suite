-- Allow unauthenticated users to submit reassignment requests during registration
CREATE POLICY "Allow reassignment request submissions during registration" 
ON public.organization_reassignment_requests 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);