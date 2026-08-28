CREATE TABLE public.external_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  api_type text NOT NULL DEFAULT 'organization_basic',
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  request_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_api_keys TO authenticated;
GRANT ALL ON public.external_api_keys TO service_role;

ALTER TABLE public.external_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api keys" ON public.external_api_keys
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create api keys" ON public.external_api_keys
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update api keys" ON public.external_api_keys
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete api keys" ON public.external_api_keys
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_external_api_keys_updated_at
  BEFORE UPDATE ON public.external_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();