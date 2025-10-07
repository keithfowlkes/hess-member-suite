-- Update the handle_new_user trigger to match current profiles table schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  new_profile_id uuid;
  organization_name text;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'keith.fowlkes@hessconsortium.org' THEN
    user_role := 'admin';
  ELSE
    user_role := 'member';
  END IF;

  -- Extract organization name
  organization_name := COALESCE(NEW.raw_user_meta_data->>'organization', '');
  
  -- Log for debugging
  RAISE NOTICE 'Processing new user: % with organization: %', NEW.email, organization_name;

  -- Insert profile with only fields that exist in profiles table
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    email,
    organization,
    phone,
    primary_contact_title,
    secondary_first_name,
    secondary_last_name,
    secondary_contact_title,
    secondary_contact_email,
    secondary_contact_phone,
    login_hint
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    organization_name,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'primary_contact_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_contact_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_contact_email', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_contact_phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'login_hint', '')
  )
  RETURNING id INTO new_profile_id;
  
  RAISE NOTICE 'Profile created with ID: % for user: %', new_profile_id, NEW.id;
  
  -- Create organization record if it doesn't exist and user has organization data
  IF organization_name != '' AND organization_name IS NOT NULL THEN
    RAISE NOTICE 'Checking if organization exists: %', organization_name;
    
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = organization_name) THEN
      RAISE NOTICE 'Creating new organization: % for user: %', organization_name, NEW.id;
      
      INSERT INTO public.organizations (
        name, 
        contact_person_id, 
        email,
        membership_status
      )
      VALUES (
        organization_name,
        new_profile_id,
        NEW.email,
        'active'::membership_status
      );
      
      RAISE NOTICE 'Organization % created successfully for user %', organization_name, NEW.id;
    ELSE
      RAISE NOTICE 'Organization % already exists, skipping creation', organization_name;
    END IF;
  ELSE
    RAISE NOTICE 'No organization name provided for user %', NEW.id;
  END IF;
  
  -- Assign appropriate role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RAISE NOTICE 'User role % assigned to user %', user_role, NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW; -- Continue processing even if there's an error
END;
$function$;