-- Fix the pending registrations RLS policy to be simpler and more reliable
DROP POLICY IF EXISTS "Admins can manage all pending registrations" ON public.pending_registrations;

-- Create a simpler policy that just checks the email directly
CREATE POLICY "Keith admin can manage pending registrations" ON public.pending_registrations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'keith.fowlkes@hessconsortium.org'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'keith.fowlkes@hessconsortium.org'
  )
);