
CREATE TABLE IF NOT EXISTS public.trend_analytics_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  analytic_key text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trend_analytics_entries TO authenticated;
GRANT ALL ON public.trend_analytics_entries TO service_role;

ALTER TABLE public.trend_analytics_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trend entries"
  ON public.trend_analytics_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert trend entries"
  ON public.trend_analytics_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update trend entries"
  ON public.trend_analytics_entries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete trend entries"
  ON public.trend_analytics_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trend_analytics_entries_updated_at
  BEFORE UPDATE ON public.trend_analytics_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.trend_analytics_entries (title, analytic_key, description, display_order) VALUES
  ('Organization Size vs ERP System Choice', 'org_size_erp', 'Correlation between organization size and ERP system selection', 10),
  ('Organization Size vs LMS Choice', 'org_size_lms', 'Correlation between organization size and Learning Management System selection', 20),
  ('Organization Size vs Financial System Choice', 'org_size_financial', 'Correlation between organization size and Financial System selection', 30),
  ('HESS Member Institution Enrollment Trends', 'hess_enrollment', 'Enrollment trends across HESS member institutions from 2020 to 2025', 40);
