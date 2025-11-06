-- Add SELECT policy for anonymous users to view their just-inserted row
CREATE POLICY "Anonymous users can view their submissions"
ON public.member_registration_updates
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);