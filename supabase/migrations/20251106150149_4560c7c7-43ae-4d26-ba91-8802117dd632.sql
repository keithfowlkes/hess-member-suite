-- Drop the existing admin policy that covers ALL operations
DROP POLICY IF EXISTS "Admins can manage all registration updates" ON public.member_registration_updates;

-- Recreate admin policies separately for each operation type (excluding INSERT which is handled separately)
CREATE POLICY "Admins can view all registration updates"
ON public.member_registration_updates
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update registration updates"
ON public.member_registration_updates
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete registration updates"
ON public.member_registration_updates
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));