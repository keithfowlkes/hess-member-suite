CREATE TABLE public.arctic_scan_rows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  observation_time text NOT NULL,
  organization text NOT NULL,
  category text NOT NULL,
  urgency text NOT NULL,
  events integer NOT NULL DEFAULT 0,
  unique_event_group_ids integer NOT NULL DEFAULT 0,
  unique_ips integer NOT NULL DEFAULT 0,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX arctic_scan_rows_unique_key
  ON public.arctic_scan_rows (observation_time, organization, category, urgency);
CREATE INDEX arctic_scan_rows_org_idx ON public.arctic_scan_rows (organization);

GRANT SELECT ON public.arctic_scan_rows TO authenticated;
GRANT ALL ON public.arctic_scan_rows TO service_role;

ALTER TABLE public.arctic_scan_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and cohort leaders can view all arctic rows"
ON public.arctic_scan_rows
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'cohort_leader'::app_role)
);

CREATE POLICY "Members can view their own organization arctic rows"
ON public.arctic_scan_rows
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id IN (SELECT public.get_user_organization_ids(auth.uid()))
      AND lower(o.name) = lower(arctic_scan_rows.organization)
  )
);

CREATE TRIGGER update_arctic_scan_rows_updated_at
BEFORE UPDATE ON public.arctic_scan_rows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.arctic_scan_syncs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running',
  row_count integer NOT NULL DEFAULT 0,
  observation_time text,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.arctic_scan_syncs TO authenticated;
GRANT ALL ON public.arctic_scan_syncs TO service_role;

ALTER TABLE public.arctic_scan_syncs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view arctic sync status"
ON public.arctic_scan_syncs
FOR SELECT
TO authenticated
USING (true);