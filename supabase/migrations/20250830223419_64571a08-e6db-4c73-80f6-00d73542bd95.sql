-- Fix RLS policies for pending_registrations to work with keith.fowlkes@hessconsortium.org
DROP POLICY IF EXISTS "Admins can manage all pending registrations" ON public.pending_registrations;

-- Create a more robust admin policy that works with the specific admin email
CREATE POLICY "Admins can manage all pending registrations" ON public.pending_registrations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    JOIN user_roles ur ON p.user_id = ur.user_id 
    WHERE p.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  ) OR 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.email = 'keith.fowlkes@hessconsortium.org'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    JOIN user_roles ur ON p.user_id = ur.user_id 
    WHERE p.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  ) OR 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.email = 'keith.fowlkes@hessconsortium.org'
  )
);