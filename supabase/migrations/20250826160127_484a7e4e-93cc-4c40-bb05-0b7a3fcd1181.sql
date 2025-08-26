-- Add new fields to profiles table for additional computer options
ALTER TABLE public.profiles ADD COLUMN primary_office_hp BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN primary_office_microsoft BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN primary_office_other BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN primary_office_other_details TEXT;

-- Update the handle_new_user function to include the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'keith.fowlkes@hessconsortium.org' THEN
    user_role := 'admin';
  ELSE
    user_role := 'member';
  END IF;

  -- Insert profile with all the new fields
  INSERT INTO public.profiles (
    user_id, first_name, last_name, email,
    organization, state_association, student_fte, address, city, state, zip,
    primary_contact_title, secondary_first_name, secondary_last_name,
    secondary_contact_title, secondary_contact_email,
    student_information_system, financial_system, financial_aid, hcm_hr,
    payroll_system, purchasing_system, housing_management, learning_management,
    admissions_crm, alumni_advancement_crm, primary_office_apple,
    primary_office_asus, primary_office_dell, primary_office_hp,
    primary_office_microsoft, primary_office_other, primary_office_other_details,
    other_software_comments
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'organization', ''),
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
    COALESCE(NEW.raw_user_meta_data->>'other_software_comments', '')
  );
  
  -- Assign appropriate role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$function$;