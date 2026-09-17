CREATE TABLE public.business_partner_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.business_partners(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  institution_name text NOT NULL,
  contact_name text,
  contact_title text,
  contact_email text,
  contact_phone text,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_partner_references TO authenticated;
GRANT ALL ON public.business_partner_references TO service_role;

ALTER TABLE public.business_partner_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view partner references"
ON public.business_partner_references
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage partner references"
ON public.business_partner_references
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_business_partner_references_partner ON public.business_partner_references(partner_id);

CREATE TRIGGER update_business_partner_references_updated_at
BEFORE UPDATE ON public.business_partner_references
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();