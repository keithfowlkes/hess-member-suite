-- Add admin role to current authenticated user
-- First, check if user already has a role entry
INSERT INTO public.user_roles (user_id, role) 
SELECT auth.uid(), 'admin'::public.app_role
WHERE auth.uid() IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
);