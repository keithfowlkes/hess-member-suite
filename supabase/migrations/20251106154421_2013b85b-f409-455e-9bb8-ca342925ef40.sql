-- Drop the incorrect policy
DROP POLICY IF EXISTS "Public can submit registration updates" ON public.member_registration_updates;

-- Create a policy that allows BOTH anonymous (anon) and authenticated users to insert
CREATE POLICY "Allow anonymous and authenticated inserts"
ON public.member_registration_updates
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);