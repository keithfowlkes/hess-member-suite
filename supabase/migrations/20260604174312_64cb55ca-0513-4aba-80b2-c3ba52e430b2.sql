
CREATE TABLE IF NOT EXISTS public.conference_registration_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conference_slug text NOT NULL DEFAULT 'hess2026',
  code text NOT NULL UNIQUE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  sent_to_conference_at timestamptz,
  sent_status text NOT NULL DEFAULT 'pending',
  send_error text,
  redeemed_at timestamptz,
  redeemed_attendee_email text,
  redeemed_attendee_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conference_registration_codes_org_conf_unique UNIQUE (organization_id, conference_slug)
);

GRANT SELECT ON public.conference_registration_codes TO authenticated;
GRANT ALL ON public.conference_registration_codes TO service_role;

ALTER TABLE public.conference_registration_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all conference registration codes"
  ON public.conference_registration_codes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their organization's code"
  ON public.conference_registration_codes
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization_by_contact(auth.uid())
  );

CREATE TRIGGER update_conference_registration_codes_updated_at
  BEFORE UPDATE ON public.conference_registration_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'conference_hub_registration_codes_enabled',
  'false',
  'When true, issue and push a unique conference registration code to the Conference Hub each time a membership fee invoice is marked paid.'
)
ON CONFLICT (setting_key) DO NOTHING;
