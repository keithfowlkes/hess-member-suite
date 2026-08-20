ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS invited_first_name text,
  ADD COLUMN IF NOT EXISTS invited_last_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_org_primary_contact(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.profiles p ON p.id = o.contact_person_id
    WHERE o.id = _org_id AND p.user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Primary contacts can view their org invitations" ON public.organization_invitations;
CREATE POLICY "Primary contacts can view their org invitations"
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (public.is_org_primary_contact(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Primary contacts can create org invitations" ON public.organization_invitations;
CREATE POLICY "Primary contacts can create org invitations"
  ON public.organization_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_primary_contact(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Primary contacts can update their org invitations" ON public.organization_invitations;
CREATE POLICY "Primary contacts can update their org invitations"
  ON public.organization_invitations
  FOR UPDATE
  TO authenticated
  USING (public.is_org_primary_contact(auth.uid(), organization_id))
  WITH CHECK (public.is_org_primary_contact(auth.uid(), organization_id));

GRANT SELECT, INSERT, UPDATE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;