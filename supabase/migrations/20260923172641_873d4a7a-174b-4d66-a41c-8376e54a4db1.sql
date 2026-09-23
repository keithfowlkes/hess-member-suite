CREATE OR REPLACE FUNCTION public.get_board_member_revenue_summary()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _total_billed numeric; _paid_revenue numeric; _orgs jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'board_member') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(SUM(o.annual_fee_amount), 0) INTO _total_billed
    FROM public.organizations o
   WHERE o.annual_fee_amount > 0 AND o.name NOT ILIKE 'Administrator%';
  SELECT COALESCE(SUM(COALESCE(i.prorated_amount, i.amount)), 0) INTO _paid_revenue
    FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id
   WHERE i.status = 'paid' AND o.name NOT ILIKE 'Administrator%';
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'membership_status', o.membership_status,
      'annual_fee_amount', o.annual_fee_amount, 'city', o.city, 'state', o.state,
      'has_paid_invoice', EXISTS (SELECT 1 FROM public.invoices i WHERE i.organization_id = o.id AND i.status = 'paid')
    ) ORDER BY o.name), '[]'::jsonb) INTO _orgs
    FROM public.organizations o
   WHERE o.annual_fee_amount > 0 AND o.name NOT ILIKE 'Administrator%';
  RETURN jsonb_build_object('total_billed', _total_billed, 'paid_revenue', _paid_revenue, 'organizations', _orgs);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_board_member_revenue_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_board_member_revenue_summary() TO authenticated, service_role;