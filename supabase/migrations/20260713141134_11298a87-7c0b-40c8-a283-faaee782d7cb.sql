
CREATE OR REPLACE FUNCTION public.get_user_organization_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id
  FROM public.organizations o
  JOIN public.profiles p ON p.id = o.contact_person_id
  WHERE p.user_id = _user_id
  UNION
  SELECT o.id
  FROM public.organizations o
  JOIN public.profiles p ON p.organization = o.name
  WHERE p.user_id = _user_id
$$;

DROP POLICY IF EXISTS "Members can view own invoices" ON public.invoices;
CREATE POLICY "Members can view own invoices"
  ON public.invoices FOR SELECT
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));
