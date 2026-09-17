CREATE TABLE public.business_partner_reference_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL UNIQUE REFERENCES public.business_partners(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_partner_reference_summaries TO authenticated;
GRANT ALL ON public.business_partner_reference_summaries TO service_role;
ALTER TABLE public.business_partner_reference_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated members can view reference summaries"
ON public.business_partner_reference_summaries
FOR SELECT TO authenticated
USING (true);
CREATE POLICY "Admins can manage reference summaries"
ON public.business_partner_reference_summaries
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_business_partner_reference_summaries_updated_at
BEFORE UPDATE ON public.business_partner_reference_summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();