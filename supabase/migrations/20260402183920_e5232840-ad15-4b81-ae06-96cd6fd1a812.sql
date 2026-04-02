CREATE TABLE public.simplelists_cohort_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_field TEXT NOT NULL,
  field_value TEXT NOT NULL,
  simplelists_list_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(system_field, field_value)
);

ALTER TABLE public.simplelists_cohort_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cohort mappings"
  ON public.simplelists_cohort_mappings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_simplelists_cohort_mappings_updated_at
  BEFORE UPDATE ON public.simplelists_cohort_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();