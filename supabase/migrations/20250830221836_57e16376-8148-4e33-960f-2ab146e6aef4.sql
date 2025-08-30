-- Add RLS policy to allow anyone to insert pending registrations
CREATE POLICY "Anyone can create pending registrations" 
ON public.pending_registrations 
FOR INSERT 
TO public
WITH CHECK (true);