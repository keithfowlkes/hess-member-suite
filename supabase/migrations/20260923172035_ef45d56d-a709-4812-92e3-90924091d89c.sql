REVOKE EXECUTE ON FUNCTION public.get_board_member_revenue_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_board_member_revenue_summary() TO authenticated, service_role;