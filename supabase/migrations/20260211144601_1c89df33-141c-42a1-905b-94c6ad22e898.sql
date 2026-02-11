
-- Fix function search path mutable for setup_admin_user
CREATE OR REPLACE FUNCTION public.setup_admin_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RAISE NOTICE 'Admin user setup completed. User should use password reset if login fails.';
END;
$function$;
