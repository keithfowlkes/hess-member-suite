CREATE TABLE public.organization_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  organization_name text NOT NULL,
  contact_name text,
  contact_email text,
  snapshot jsonb,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  restored_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.organization_deletions TO authenticated;
GRANT ALL ON public.organization_deletions TO service_role;
ALTER TABLE public.organization_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view deletions" ON public.organization_deletions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update deletions" ON public.organization_deletions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ON public.organization_deletions (deleted_at DESC);