-- Create organization record for the recent registration that was missed
INSERT INTO public.organizations (
  name, 
  contact_person_id, 
  email, 
  membership_status,
  created_at
)
VALUES (
  'TEST COLLEGE',
  '9f42a56e-65cf-4be0-ba31-5fbf22937a58',
  'fowlkes@thecoalition.us',
  'pending',
  '2025-08-29 00:06:20.185223+00'
);