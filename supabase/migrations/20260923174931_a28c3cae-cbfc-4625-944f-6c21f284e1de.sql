CREATE TABLE public.contact_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_title text,
  status text NOT NULL,
  confidence text,
  found_title text,
  summary text,
  linkedin_url text,
  institutional_url text,
  notes text,
  verified_by uuid,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_verifications TO authenticated;
GRANT ALL ON public.contact_verifications TO service_role;
ALTER TABLE public.contact_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contact verifications" ON public.contact_verifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_contact_verifications_updated_at BEFORE UPDATE ON public.contact_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();