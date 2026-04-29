DROP POLICY IF EXISTS "Admins can manage all communications" ON public.communications;
DROP POLICY IF EXISTS "Organization contacts can manage their communications" ON public.communications;

CREATE POLICY "Admins can manage all communications"
ON public.communications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Organization contacts can manage their communications"
ON public.communications
FOR ALL
USING (
  organization_id IN (
    SELECT o.id FROM organizations o
    JOIN profiles p ON p.id = o.contact_person_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT o.id FROM organizations o
    JOIN profiles p ON p.id = o.contact_person_id
    WHERE p.user_id = auth.uid()
  )
);