-- Temporarily add a policy that allows authenticated users to see organizations for debugging
CREATE POLICY "Authenticated users can view organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (true);

-- Also add a policy for profiles to make sure they can be read by authenticated users
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);