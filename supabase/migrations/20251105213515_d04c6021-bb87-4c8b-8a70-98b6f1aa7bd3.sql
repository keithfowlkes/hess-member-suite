-- Remove the public read policy that exposes profiles to anyone
DROP POLICY IF EXISTS "Public can view system fields for registration" ON public.profiles;

-- Add policy for authenticated members to view all profiles (for inter-organization contact viewing)
CREATE POLICY "Authenticated members can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);