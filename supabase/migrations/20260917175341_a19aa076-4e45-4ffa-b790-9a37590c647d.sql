CREATE TABLE public.partnership_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  badge_style text NOT NULL DEFAULT 'default',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partnership_levels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partnership_levels TO authenticated;
GRANT ALL ON public.partnership_levels TO service_role;

ALTER TABLE public.partnership_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view partnership levels"
  ON public.partnership_levels FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage partnership levels"
  ON public.partnership_levels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_partnership_levels_updated_at
  BEFORE UPDATE ON public.partnership_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.partnership_levels (name, description, badge_style, display_order)
VALUES
  ('Business Contract Partner', 'Vendor under a formal HESS Consortium business contract.', 'default', 1),
  ('Business Affiliate', 'Affiliated vendor participating with the HESS Consortium.', 'secondary', 2);

ALTER TABLE public.business_partners
  ADD COLUMN partnership_level_id uuid REFERENCES public.partnership_levels(id) ON DELETE SET NULL;

DROP VIEW IF EXISTS public.public_business_partner_directory;
CREATE VIEW public.public_business_partner_directory
WITH (security_invoker = off) AS
SELECT
  bp.id,
  bp.name,
  bp.slug,
  bp.short_description,
  bp.description_html,
  bp.logo_url,
  bp.banner_url,
  bp.website_url,
  bp.categories,
  bp.is_featured,
  bp.display_order,
  bp.partnership_level_id
FROM public.business_partners bp
WHERE bp.is_published = true;

GRANT SELECT ON public.public_business_partner_directory TO anon, authenticated;
GRANT ALL ON public.public_business_partner_directory TO service_role;