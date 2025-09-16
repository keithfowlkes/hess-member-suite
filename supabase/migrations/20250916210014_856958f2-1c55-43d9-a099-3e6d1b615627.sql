-- Fix RLS policies for member_registration_updates to allow anonymous submissions
-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Admins can manage all registration updates" ON public.member_registration_updates;
DROP POLICY IF EXISTS "Anyone can submit registration updates" ON public.member_registration_updates;
DROP POLICY IF EXISTS "Submitters can view their own registration updates" ON public.member_registration_updates;

-- Create new simplified policies for the approval method
CREATE POLICY "Allow anonymous submissions for registration updates" 
ON public.member_registration_updates 
FOR INSERT 
TO public
WITH CHECK (true);

-- Allow admins to manage all registration updates
CREATE POLICY "Admins can manage all registration updates" 
ON public.member_registration_updates 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- Allow anyone to view registration updates (for the public forms)
CREATE POLICY "Allow public read access for registration updates" 
ON public.member_registration_updates 
FOR SELECT 
TO public
USING (true);

-- Also fix pending_registrations to use the same pattern
DROP POLICY IF EXISTS "Anyone can create pending registrations" ON public.pending_registrations;
DROP POLICY IF EXISTS "Temporary bypass for debugging" ON public.pending_registrations;

-- Allow anonymous submissions for new registrations  
CREATE POLICY "Allow anonymous new registrations" 
ON public.pending_registrations 
FOR INSERT 
TO public
WITH CHECK (true);

-- Allow admins to manage pending registrations
CREATE POLICY "Admins can manage pending registrations" 
ON public.pending_registrations 
FOR ALL
TO authenticated  
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);