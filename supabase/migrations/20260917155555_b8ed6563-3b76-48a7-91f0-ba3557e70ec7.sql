CREATE TABLE public.business_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  description_html text,
  member_offer_html text,
  logo_url text,
  banner_url text,
  website_url text,
  categories text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.business_partner_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.business_partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.business_partner_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.business_partners(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_bp_contacts_partner ON public.business_partner_contacts(partner_id);
CREATE INDEX idx_bp_files_partner ON public.business_partner_files(partner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_partners TO authenticated;
GRANT ALL ON public.business_partners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_partner_contacts TO authenticated;
GRANT ALL ON public.business_partner_contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_partner_files TO authenticated;
GRANT ALL ON public.business_partner_files TO service_role;

ALTER TABLE public.business_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_partner_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_partner_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published partners"
  ON public.business_partners FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert partners"
  ON public.business_partners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partners"
  ON public.business_partners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete partners"
  ON public.business_partners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view contacts of published partners"
  ON public.business_partner_contacts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_partners bp
    WHERE bp.id = partner_id
      AND (bp.is_published = true OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Admins manage partner contacts"
  ON public.business_partner_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view files of published partners"
  ON public.business_partner_files FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_partners bp
    WHERE bp.id = partner_id
      AND (bp.is_published = true OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Admins manage partner files"
  ON public.business_partner_files FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_business_partners_updated_at
  BEFORE UPDATE ON public.business_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_partner_contacts_updated_at
  BEFORE UPDATE ON public.business_partner_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_partner_files_updated_at
  BEFORE UPDATE ON public.business_partner_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public directory view: published partners only, without member-only offer text
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
  bp.display_order
FROM public.business_partners bp
WHERE bp.is_published = true;

GRANT SELECT ON public.public_business_partner_directory TO anon, authenticated;
GRANT ALL ON public.public_business_partner_directory TO service_role;