-- Drop the current policy
DROP POLICY IF EXISTS "Allow all users to submit registration updates" ON public.member_registration_updates;

-- Create a policy that explicitly targets both anon and authenticated roles in one policy
CREATE POLICY "Public can submit registration updates"
ON public.member_registration_updates
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);

-- Ensure the public role has the necessary grants
GRANT INSERT ON public.member_registration_updates TO PUBLIC;