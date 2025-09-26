-- Update the handle_new_user function to handle the new secondary_contact_phone field
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

  -- Insert profile with all the new fields including is_private_nonprofit and secondary_contact_phone
  INSERT INTO public.profiles (
    user_id, first_name, last_name, email,
    organization, state_association, student_fte, address, city, state, zip,
    primary_contact_title, secondary_first_name, secondary_last_name,
    secondary_contact_title, secondary_contact_email, secondary_contact_phone,
    student_information_system, financial_system, financial_aid, hcm_hr,
    payroll_system, purchasing_system, housing_management, learning_management,
    admissions_crm, alumni_advancement_crm, primary_office_apple,
    primary_office_asus, primary_office_dell, primary_office_hp,
    primary_office_microsoft, primary_office_other, primary_office_other_details,
    other_software_comments, is_private_nonprofit
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    organization_name,
    COALESCE(NEW.raw_user_meta_data->>'state_association', ''),
    COALESCE((NEW.raw_user_meta_data->>'student_fte')::INTEGER, NULL),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'zip', ''),
    COALESCE(NEW.raw_user_meta_data->>'primary_contact_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_contact_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_contact_email', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_contact_phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'student_information_system', ''),
    COALESCE(NEW.raw_user_meta_data->>'financial_system', ''),
    COALESCE(NEW.raw_user_meta_data->>'financial_aid', ''),
    COALESCE(NEW.raw_user_meta_data->>'hcm_hr', ''),
    COALESCE(NEW.raw_user_meta_data->>'payroll_system', ''),
    COALESCE(NEW.raw_user_meta_data->>'purchasing_system', ''),
    COALESCE(NEW.raw_user_meta_data->>'housing_management', ''),
    COALESCE(NEW.raw_user_meta_data->>'learning_management', ''),
    COALESCE(NEW.raw_user_meta_data->>'admissions_crm', ''),
    COALESCE(NEW.raw_user_meta_data->>'alumni_advancement_crm', ''),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_apple')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_asus')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_dell')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_hp')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_microsoft')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_other')::BOOLEAN, FALSE),
    COALESCE(NEW.raw_user_meta_data->>'primary_office_other_details', ''),
    COALESCE(NEW.raw_user_meta_data->>'other_software_comments', ''),
    COALESCE((NEW.raw_user_meta_data->>'isPrivateNonProfit')::BOOLEAN, FALSE)
  )
  RETURNING id INTO new_profile_id;
  
  RAISE NOTICE 'Profile created with ID: % for user: %', new_profile_id, NEW.id;
  
  -- Create organization record if it doesn't exist and user has organization data
  IF organization_name != '' AND organization_name IS NOT NULL THEN
    RAISE NOTICE 'Checking if organization exists: %', organization_name;
    
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = organization_name) THEN
      RAISE NOTICE 'Creating new organization: % for user: %', organization_name, NEW.id;
      
      INSERT INTO public.organizations (
        name, contact_person_id, student_fte, address_line_1, city, state, zip_code,
        phone, email, primary_contact_title, secondary_first_name, secondary_last_name,
        secondary_contact_title, secondary_contact_email, secondary_contact_phone, student_information_system,
        financial_system, financial_aid, hcm_hr, payroll_system, purchasing_system,
        housing_management, learning_management, admissions_crm, alumni_advancement_crm,
        primary_office_apple, primary_office_asus, primary_office_dell, primary_office_hp,
        primary_office_microsoft, primary_office_other, primary_office_other_details,
        other_software_comments, membership_status
      )
      VALUES (
        organization_name,
        new_profile_id,
        COALESCE((NEW.raw_user_meta_data->>'student_fte')::INTEGER, NULL),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        COALESCE(NEW.raw_user_meta_data->>'city', ''),
        COALESCE(NEW.raw_user_meta_data->>'state', ''),
        COALESCE(NEW.raw_user_meta_data->>'zip', ''),
        NULL, -- phone will be updated later if available
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'primary_contact_title', ''),
        COALESCE(NEW.raw_user_meta_data->>'secondary_first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'secondary_last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'secondary_contact_title', ''),
        COALESCE(NEW.raw_user_meta_data->>'secondary_contact_email', ''),
        COALESCE(NEW.raw_user_meta_data->>'secondary_contact_phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'student_information_system', ''),
        COALESCE(NEW.raw_user_meta_data->>'financial_system', ''),
        COALESCE(NEW.raw_user_meta_data->>'financial_aid', ''),
        COALESCE(NEW.raw_user_meta_data->>'hcm_hr', ''),
        COALESCE(NEW.raw_user_meta_data->>'payroll_system', ''),
        COALESCE(NEW.raw_user_meta_data->>'purchasing_system', ''),
        COALESCE(NEW.raw_user_meta_data->>'housing_management', ''),
        COALESCE(NEW.raw_user_meta_data->>'learning_management', ''),
        COALESCE(NEW.raw_user_meta_data->>'admissions_crm', ''),
        COALESCE(NEW.raw_user_meta_data->>'alumni_advancement_crm', ''),
        COALESCE((NEW.raw_user_meta_data->>'primary_office_apple')::BOOLEAN, FALSE),
        COALESCE((NEW.raw_user_meta_data->>'primary_office_asus')::BOOLEAN, FALSE),
        COALESCE((NEW.raw_user_meta_data->>'primary_office_dell')::BOOLEAN, FALSE),
        COALESCE((NEW.raw_user_meta_data->>'primary_office_hp')::BOOLEAN, FALSE),
        COALESCE((NEW.raw_user_meta_data->>'primary_office_microsoft')::BOOLEAN, FALSE),
        COALESCE((NEW.raw_user_meta_data->>'primary_office_other')::BOOLEAN, FALSE),
        COALESCE(NEW.raw_user_meta_data->>'primary_office_other_details', ''),
        COALESCE(NEW.raw_user_meta_data->>'other_software_comments', ''),
        'active'::membership_status  -- Changed from 'pending' to 'active'
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