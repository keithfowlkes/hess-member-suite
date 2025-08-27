-- Migrate existing data from profiles to organizations
-- This ensures data consistency for the new organization-centric model

UPDATE public.organizations 
SET 
  primary_contact_title = p.primary_contact_title,
  secondary_first_name = p.secondary_first_name,
  secondary_last_name = p.secondary_last_name,
  secondary_contact_title = p.secondary_contact_title,
  secondary_contact_email = p.secondary_contact_email,
  student_information_system = p.student_information_system,
  financial_system = p.financial_system,
  financial_aid = p.financial_aid,
  hcm_hr = p.hcm_hr,
  payroll_system = p.payroll_system,
  purchasing_system = p.purchasing_system,
  housing_management = p.housing_management,
  learning_management = p.learning_management,
  admissions_crm = p.admissions_crm,
  alumni_advancement_crm = p.alumni_advancement_crm,
  primary_office_apple = p.primary_office_apple,
  primary_office_asus = p.primary_office_asus,
  primary_office_dell = p.primary_office_dell,
  primary_office_hp = p.primary_office_hp,
  primary_office_microsoft = p.primary_office_microsoft,
  primary_office_other = p.primary_office_other,
  primary_office_other_details = p.primary_office_other_details,
  other_software_comments = p.other_software_comments,
  updated_at = now()
FROM public.profiles p
WHERE organizations.contact_person_id = p.id
  AND p.id IS NOT NULL;