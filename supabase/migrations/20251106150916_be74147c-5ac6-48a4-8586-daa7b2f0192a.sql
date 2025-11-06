-- Drop all INSERT policies to start fresh
DROP POLICY IF EXISTS "Allow public submission of registration updates" ON public.member_registration_updates;
DROP POLICY IF EXISTS "Anyone can submit registration updates" ON public.member_registration_updates;
DROP POLICY IF EXISTS "Public and authenticated users can submit registration updates" ON public.member_registration_updates;

-- Create a simple policy for anonymous users to insert
CREATE POLICY "Anonymous users can submit registration updates"
ON public.member_registration_updates
FOR INSERT
TO anon
WITH CHECK (true);

-- Create a separate policy for authenticated users to insert
CREATE POLICY "Authenticated users can submit registration updates"
ON public.member_registration_updates
FOR INSERT
TO authenticated
WITH CHECK (true);