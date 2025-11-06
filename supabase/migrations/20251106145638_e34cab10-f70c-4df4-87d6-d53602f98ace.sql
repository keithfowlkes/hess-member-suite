-- Drop the existing anonymous-only policy
DROP POLICY IF EXISTS "Allow anonymous submissions for registration updates" ON public.member_registration_updates;

-- Create a new policy that allows both anonymous and authenticated users to submit
CREATE POLICY "Anyone can submit registration updates"
ON public.member_registration_updates
FOR INSERT
TO public
WITH CHECK (true);

-- Ensure authenticated users can view their own submissions
CREATE POLICY "Users can view their own registration updates"
ON public.member_registration_updates
FOR SELECT
TO authenticated
USING (
  submitted_email IN (
    SELECT email FROM public.profiles WHERE user_id = auth.uid()
  )
);