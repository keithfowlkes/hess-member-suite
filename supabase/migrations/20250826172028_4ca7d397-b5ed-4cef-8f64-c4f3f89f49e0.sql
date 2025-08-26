-- Remove the temporary policy and fix the admin access issue
DROP POLICY "Authenticated users can view organizations" ON public.organizations;
DROP POLICY "Authenticated users can view profiles" ON public.profiles;

-- Recreate the proper admin policies with better RLS
CREATE POLICY "Admins can manage all organizations v2" 
ON public.organizations 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Members can view own organization v2" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (
  contact_person_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can update own organization v2" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING (
  contact_person_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Fix profiles access
CREATE POLICY "Users can view own profile v2" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles v2" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can update own profile v2" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());