ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS can_edit_organization boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.colleague_can_edit_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_primary_contact(_user_id, _org_id)
      OR EXISTS (
        SELECT 1
        FROM public.organization_invitations oi
        JOIN public.profiles p ON lower(p.email) = lower(oi.email)
        WHERE oi.organization_id = _org_id
          AND oi.can_edit_organization = true
          AND oi.used_at IS NOT NULL
          AND oi.revoked_at IS NULL
          AND COALESCE(oi.status, '') <> 'revoked'
          AND p.user_id = _user_id
      );
$$;

DROP POLICY IF EXISTS "Users can create edit requests for their organization" ON public.organization_profile_edit_requests;
CREATE POLICY "Users can create edit requests for their organization"
ON public.organization_profile_edit_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND public.colleague_can_edit_org(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Users can view their own organization's edit requests" ON public.organization_profile_edit_requests;
CREATE POLICY "Users can view their own organization's edit requests"
ON public.organization_profile_edit_requests
FOR SELECT
TO authenticated
USING (public.colleague_can_edit_org(auth.uid(), organization_id));