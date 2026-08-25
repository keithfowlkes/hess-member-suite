DROP POLICY IF EXISTS "Admins and cohort leaders can view all arctic rows" ON public.arctic_scan_rows;

CREATE POLICY "Admins can view all arctic rows"
ON public.arctic_scan_rows
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));