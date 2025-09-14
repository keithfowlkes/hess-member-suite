-- Create missing profile for the approved user
INSERT INTO public.profiles (
  user_id, first_name, last_name, email, organization, student_fte, address, city, state, zip,
  primary_contact_title, secondary_first_name, secondary_last_name, secondary_contact_title, secondary_contact_email,
  student_information_system, financial_system, financial_aid, hcm_hr, payroll_system, purchasing_system,
  housing_management, learning_management, admissions_crm, alumni_advancement_crm,
  primary_office_apple, primary_office_asus, primary_office_dell, primary_office_hp, primary_office_microsoft,
  primary_office_other, primary_office_other_details, other_software_comments, is_private_nonprofit
)
SELECT 
  u.id,
  pr.first_name,
  pr.last_name,
  pr.email,
  pr.organization_name,
  pr.student_fte,
  pr.address,
  pr.city,
  pr.state,
  pr.zip,
  pr.primary_contact_title,
  pr.secondary_first_name,
  pr.secondary_last_name,
  pr.secondary_contact_title,
  pr.secondary_contact_email,
  pr.student_information_system,
  pr.financial_system,
  pr.financial_aid,
  pr.hcm_hr,
  pr.payroll_system,
  pr.purchasing_system,
  pr.housing_management,
  pr.learning_management,
  pr.admissions_crm,
  pr.alumni_advancement_crm,
  pr.primary_office_apple,
  pr.primary_office_asus,
  pr.primary_office_dell,
  pr.primary_office_hp,
  pr.primary_office_microsoft,
  pr.primary_office_other,
  pr.primary_office_other_details,
  pr.other_software_comments,
  pr.is_private_nonprofit
FROM auth.users u
JOIN pending_registrations pr ON u.email = pr.email
WHERE u.email = 'keith.fowlkes@higheredcommunities.org'
  AND pr.approval_status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id);

-- Create the organization record
INSERT INTO public.organizations (
  name, contact_person_id, student_fte, address_line_1, city, state, zip_code,
  email, primary_contact_title, secondary_first_name, secondary_last_name,
  secondary_contact_title, secondary_contact_email, student_information_system,
  financial_system, financial_aid, hcm_hr, payroll_system, purchasing_system,
  housing_management, learning_management, admissions_crm, alumni_advancement_crm,
  primary_office_apple, primary_office_asus, primary_office_dell, primary_office_hp,
  primary_office_microsoft, primary_office_other, primary_office_other_details,
  other_software_comments, membership_status, membership_start_date, organization_type, country
)
SELECT 
  pr.organization_name,
  p.id,
  pr.student_fte,
  pr.address,
  pr.city,
  pr.state,
  pr.zip,
  pr.email,
  pr.primary_contact_title,
  pr.secondary_first_name,
  pr.secondary_last_name,
  pr.secondary_contact_title,
  pr.secondary_contact_email,
  pr.student_information_system,
  pr.financial_system,
  pr.financial_aid,
  pr.hcm_hr,
  pr.payroll_system,
  pr.purchasing_system,
  pr.housing_management,
  pr.learning_management,
  pr.admissions_crm,
  pr.alumni_advancement_crm,
  pr.primary_office_apple,
  pr.primary_office_asus,
  pr.primary_office_dell,
  pr.primary_office_hp,
  pr.primary_office_microsoft,
  pr.primary_office_other,
  pr.primary_office_other_details,
  pr.other_software_comments,
  'active'::membership_status,
  CURRENT_DATE,
  'member',
  'United States'
FROM pending_registrations pr
JOIN auth.users u ON u.email = pr.email
JOIN profiles p ON p.user_id = u.id
WHERE pr.email = 'keith.fowlkes@higheredcommunities.org'
  AND pr.approval_status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.name = pr.organization_name);