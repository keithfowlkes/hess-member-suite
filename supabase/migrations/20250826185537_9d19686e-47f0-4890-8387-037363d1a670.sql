-- Create RLS policy to allow public read access to organization directory information
CREATE POLICY "Public can view active organizations for directory" 
ON public.organizations 
FOR SELECT 
USING (membership_status = 'active');