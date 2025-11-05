-- Remove the public read policy that exposes registration data to anyone
DROP POLICY IF EXISTS "Allow public read access for registration updates" ON public.member_registration_updates;

-- Admins can already manage everything through the existing policy "Admins can manage all registration updates"
-- The "Allow anonymous submissions for registration updates" INSERT policy remains for public registration forms