-- Fix security linter issues by setting proper search_path for functions

CREATE OR REPLACE FUNCTION public.get_user_organization_by_contact(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.id
  FROM public.organizations o
  JOIN public.profiles p ON p.id = o.contact_person_id
  WHERE p.user_id = _user_id
$function$;

CREATE OR REPLACE FUNCTION public.sync_profile_organization_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When an organization name is updated, update the profile organization field for the contact person
  IF OLD.name IS DISTINCT FROM NEW.name AND NEW.contact_person_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET organization = NEW.name,
        updated_at = now()
    WHERE id = NEW.contact_person_id;
  END IF;
  
  RETURN NEW;
END;
$function$;