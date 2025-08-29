-- Create a function to check for and fix missing organizations
CREATE OR REPLACE FUNCTION public.fix_missing_organizations()
RETURNS TABLE(fixed_count integer, details text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  missing_org_count integer := 0;
  fix_details text[] := ARRAY[]::text[];
  profile_record RECORD;
BEGIN
  -- Find profiles that should have organizations but don't
  FOR profile_record IN 
    SELECT p.id, p.user_id, p.email, p.organization, p.first_name, p.last_name,
           p.student_fte, p.address, p.city, p.state, p.zip,
           p.primary_contact_title, p.secondary_first_name, p.secondary_last_name,
           p.secondary_contact_title, p.secondary_contact_email,
           p.student_information_system, p.financial_system, p.financial_aid,
           p.hcm_hr, p.payroll_system, p.purchasing_system, p.housing_management,
           p.learning_management, p.admissions_crm, p.alumni_advancement_crm,
           p.primary_office_apple, p.primary_office_asus, p.primary_office_dell,
           p.primary_office_hp, p.primary_office_microsoft, p.primary_office_other,
           p.primary_office_other_details, p.other_software_comments,
           p.created_at
    FROM profiles p
    WHERE p.organization IS NOT NULL 
      AND p.organization != ''
      AND NOT EXISTS (
        SELECT 1 FROM organizations o 
        WHERE o.contact_person_id = p.id
      )
      AND p.created_at > '2025-08-26'::date -- Only check recent profiles
  LOOP
    -- Create the missing organization
    INSERT INTO public.organizations (
      name, contact_person_id, email, student_fte, address_line_1, city, state, zip_code,
      primary_contact_title, secondary_first_name, secondary_last_name,
      secondary_contact_title, secondary_contact_email, student_information_system,
      financial_system, financial_aid, hcm_hr, payroll_system, purchasing_system,
      housing_management, learning_management, admissions_crm, alumni_advancement_crm,
      primary_office_apple, primary_office_asus, primary_office_dell, primary_office_hp,
      primary_office_microsoft, primary_office_other, primary_office_other_details,
      other_software_comments, membership_status, created_at
    )
    VALUES (
      profile_record.organization,
      profile_record.id,
      profile_record.email,
      profile_record.student_fte,
      profile_record.address,
      profile_record.city,
      profile_record.state,
      profile_record.zip,
      profile_record.primary_contact_title,
      profile_record.secondary_first_name,
      profile_record.secondary_last_name,
      profile_record.secondary_contact_title,
      profile_record.secondary_contact_email,
      profile_record.student_information_system,
      profile_record.financial_system,
      profile_record.financial_aid,
      profile_record.hcm_hr,
      profile_record.payroll_system,
      profile_record.purchasing_system,
      profile_record.housing_management,
      profile_record.learning_management,
      profile_record.admissions_crm,
      profile_record.alumni_advancement_crm,
      profile_record.primary_office_apple,
      profile_record.primary_office_asus,
      profile_record.primary_office_dell,
      profile_record.primary_office_hp,
      profile_record.primary_office_microsoft,
      profile_record.primary_office_other,
      profile_record.primary_office_other_details,
      profile_record.other_software_comments,
      'pending'::membership_status,
      profile_record.created_at
    );
    
    missing_org_count := missing_org_count + 1;
    fix_details := array_append(fix_details, 
      format('Created organization "%s" for profile %s (%s)', 
        profile_record.organization, profile_record.id, profile_record.email)
    );
    
    RAISE NOTICE 'Fixed missing organization: % for profile %', 
      profile_record.organization, profile_record.email;
  END LOOP;
  
  RETURN QUERY SELECT missing_org_count, fix_details;
END;
$$;

-- Add a trigger to automatically run the fix function periodically
-- This will catch any organizations that might be missed in the future
CREATE OR REPLACE FUNCTION public.check_and_fix_missing_organizations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  fix_result RECORD;
BEGIN
  -- Run the fix function whenever a new profile is created
  -- This acts as a safety net
  PERFORM pg_sleep(1); -- Small delay to ensure transaction completion
  
  SELECT * INTO fix_result FROM public.fix_missing_organizations();
  
  IF fix_result.fixed_count > 0 THEN
    RAISE NOTICE 'Auto-fixed % missing organizations after profile creation', fix_result.fixed_count;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run the check after profile inserts
DROP TRIGGER IF EXISTS check_missing_orgs_after_profile_insert ON profiles;
CREATE TRIGGER check_missing_orgs_after_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION check_and_fix_missing_organizations();

-- Run the fix function once now to catch any existing issues
SELECT * FROM public.fix_missing_organizations();