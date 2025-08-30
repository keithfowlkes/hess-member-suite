-- Create missing organization records for profiles that should have them
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
SELECT 
  p.organization,
  p.id,
  p.email,
  p.student_fte,
  p.address,
  p.city,
  p.state,
  p.zip,
  p.primary_contact_title,
  p.secondary_first_name,
  p.secondary_last_name,
  p.secondary_contact_title,
  p.secondary_contact_email,
  p.student_information_system,
  p.financial_system,
  p.financial_aid,
  p.hcm_hr,
  p.payroll_system,
  p.purchasing_system,
  p.housing_management,
  p.learning_management,
  p.admissions_crm,
  p.alumni_advancement_crm,
  p.primary_office_apple,
  p.primary_office_asus,
  p.primary_office_dell,
  p.primary_office_hp,
  p.primary_office_microsoft,
  p.primary_office_other,
  p.primary_office_other_details,
  p.other_software_comments,
  'pending'::membership_status,
  p.created_at
FROM profiles p
WHERE p.organization IS NOT NULL 
  AND p.organization != ''
  AND NOT EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.contact_person_id = p.id
  );