CREATE OR REPLACE FUNCTION public.get_board_member_revenue_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'board_member'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Board member access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_billed', COALESCE((
      SELECT SUM(COALESCE(o.annual_fee_amount, 0))
      FROM public.organizations o
    ), 0),
    'paid_revenue', COALESCE((
      SELECT SUM(COALESCE(i.prorated_amount, i.amount, 0))
      FROM public.invoices i
      WHERE i.status = 'paid'::public.invoice_status
    ), 0),
    'organizations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'membership_status', o.membership_status,
          'annual_fee_amount', o.annual_fee_amount,
          'city', o.city,
          'state', o.state,
          'has_paid_invoice', EXISTS (
            SELECT 1
            FROM public.invoices i
            WHERE i.organization_id = o.id
              AND i.status = 'paid'::public.invoice_status
          )
        )
        ORDER BY o.name
      )
      FROM public.organizations o
      WHERE COALESCE(o.annual_fee_amount, 0) > 0
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_board_member_revenue_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_board_member_revenue_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_board_member_revenue_summary() TO service_role;