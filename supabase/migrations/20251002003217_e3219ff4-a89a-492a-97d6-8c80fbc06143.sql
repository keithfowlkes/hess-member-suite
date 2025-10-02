-- Remove duplicate organization-level fields from profiles table
-- These fields should only exist in the organizations table

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS payment_platform,
DROP COLUMN IF EXISTS meal_plan_management,
DROP COLUMN IF EXISTS identity_management,
DROP COLUMN IF EXISTS door_access,
DROP COLUMN IF EXISTS document_management,
DROP COLUMN IF EXISTS voip,
DROP COLUMN IF EXISTS network_infrastructure,
DROP COLUMN IF EXISTS student_information_system,
DROP COLUMN IF EXISTS financial_system,
DROP COLUMN IF EXISTS financial_aid,
DROP COLUMN IF EXISTS hcm_hr,
DROP COLUMN IF EXISTS payroll_system,
DROP COLUMN IF EXISTS purchasing_system,
DROP COLUMN IF EXISTS housing_management,
DROP COLUMN IF EXISTS learning_management,
DROP COLUMN IF EXISTS admissions_crm,
DROP COLUMN IF EXISTS alumni_advancement_crm,
DROP COLUMN IF EXISTS primary_office_apple,
DROP COLUMN IF EXISTS primary_office_asus,
DROP COLUMN IF EXISTS primary_office_dell,
DROP COLUMN IF EXISTS primary_office_hp,
DROP COLUMN IF EXISTS primary_office_microsoft,
DROP COLUMN IF EXISTS primary_office_other,
DROP COLUMN IF EXISTS primary_office_other_details,
DROP COLUMN IF EXISTS other_software_comments,
DROP COLUMN IF EXISTS is_private_nonprofit,
DROP COLUMN IF EXISTS student_fte;

-- Keep only user-specific fields in profiles:
-- id, user_id, first_name, last_name, email, phone, organization (name reference),
-- address, city, state, zip, state_association, primary_contact_title,
-- secondary_first_name, secondary_last_name, secondary_contact_title,
-- secondary_contact_email, secondary_contact_phone, login_hint,
-- created_at, updated_at

COMMENT ON TABLE public.profiles IS 'User profile information. Organization-level data should be stored in the organizations table.';