-- Allow public read access to system field options for registration form
CREATE POLICY "Public can view system field options for registration" 
ON public.system_field_options 
FOR SELECT 
TO public 
USING (true);