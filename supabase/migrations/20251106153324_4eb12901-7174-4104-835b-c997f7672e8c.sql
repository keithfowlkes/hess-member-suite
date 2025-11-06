-- Re-enable RLS
ALTER TABLE public.member_registration_updates ENABLE ROW LEVEL SECURITY;

-- Drop all existing INSERT policies to start fresh
DROP POLICY IF EXISTS "Anonymous users can submit registration updates" ON public.member_registration_updates;
DROP POLICY IF EXISTS "Authenticated users can submit registration updates" ON public.member_registration_updates;
DROP POLICY IF EXISTS "Allow public submission of registration updates" ON public.member_registration_updates;

-- Create a single comprehensive INSERT policy for all users
CREATE POLICY "Allow all users to submit registration updates"
ON public.member_registration_updates
FOR INSERT
WITH CHECK (true);