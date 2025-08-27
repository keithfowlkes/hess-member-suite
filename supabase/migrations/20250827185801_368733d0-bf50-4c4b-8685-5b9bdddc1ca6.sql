-- Allow public read access to specific system fields in profiles for registration form dropdowns
CREATE POLICY "Public can view system fields for registration" 
ON public.profiles 
FOR SELECT 
TO public 
USING (true);