-- Fix security issues by setting search_path for functions
CREATE OR REPLACE FUNCTION public.ensure_keith_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- If keith.fowlkes@hessconsortium.org is being inserted/updated, ensure admin role
  IF NEW.email = 'keith.fowlkes@hessconsortium.org' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_keith_admin_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Prevent deletion of admin role for keith.fowlkes@hessconsortium.org
  IF OLD.role = 'admin'::app_role THEN
    IF EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = OLD.user_id 
        AND p.email = 'keith.fowlkes@hessconsortium.org'
    ) THEN
      RAISE EXCEPTION 'Cannot remove admin role from keith.fowlkes@hessconsortium.org';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$function$;