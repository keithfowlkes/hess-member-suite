-- Drop the existing INSERT policy that uses 'public' role
DROP POLICY IF EXISTS "Anyone can submit registration updates" ON public.member_registration_updates;

-- Create new policy that explicitly allows both anonymous and authenticated users to insert
CREATE POLICY "Allow public submission of registration updates"
ON public.member_registration_updates
FOR INSERT
TO anon, authenticated
WITH CHECK (true);