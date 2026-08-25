CREATE TABLE public.arctic_pricing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  organization_id UUID,
  organization_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  wants_pricing_info BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notified_emails TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.arctic_pricing_requests TO authenticated;
GRANT ALL ON public.arctic_pricing_requests TO service_role;

ALTER TABLE public.arctic_pricing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own pricing requests"
ON public.arctic_pricing_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own pricing requests"
ON public.arctic_pricing_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing requests"
ON public.arctic_pricing_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_arctic_pricing_requests_updated_at
BEFORE UPDATE ON public.arctic_pricing_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('arctic_pricing_notification_emails', 'info@hessconsortium.org', 'Comma-separated emails notified when a member requests Arctic Security pricing')
ON CONFLICT (setting_key) DO NOTHING;