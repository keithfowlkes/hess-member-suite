-- Populate System Field Options for Cohort Membership
INSERT INTO system_field_options (field_name, option_value) VALUES
  ('cohort_membership', 'Anthology'),
  ('cohort_membership', 'Ellucian Banner'),
  ('cohort_membership', 'Ellucian Colleague'),
  ('cohort_membership', 'Jenzabar ONE'),
  ('cohort_membership', 'Oracle Cloud'),
  ('cohort_membership', 'Workday')
ON CONFLICT DO NOTHING;

-- Populate System Field Options for Partner Program Interest
INSERT INTO system_field_options (field_name, option_value) VALUES
  ('partner_program_interest', 'Ellucian'),
  ('partner_program_interest', 'Jenzabar'),
  ('partner_program_interest', 'Oracle'),
  ('partner_program_interest', 'Workday'),
  ('partner_program_interest', 'None')
ON CONFLICT DO NOTHING;