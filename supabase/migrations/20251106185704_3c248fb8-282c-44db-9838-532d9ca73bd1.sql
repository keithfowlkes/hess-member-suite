
-- Normalize Financial System Peoplesoft entries
UPDATE organizations 
SET financial_system = 'Peoplesoft'
WHERE financial_system IN ('Oracle Higher Ed / PeopleSoft', 'Oracle Peoplesoft', 'Oracle PeopleSoft');

-- Normalize Student Information System Peoplesoft entries
UPDATE organizations 
SET student_information_system = 'Peoplesoft'
WHERE student_information_system IN ('Oracle Higher Ed / PeopleSoft', 'Oracle Peoplesoft', 'Oracle PeopleSoft');

-- Normalize HCM/HR Peoplesoft entries
UPDATE organizations 
SET hcm_hr = 'Peoplesoft'
WHERE hcm_hr IN ('Oracle Higher Ed / PeopleSoft', 'Oracle Peoplesoft', 'Oracle PeopleSoft');

-- Also update system_field_options if they exist
UPDATE system_field_options 
SET option_value = 'Peoplesoft'
WHERE field_name IN ('financial_system', 'student_information_system', 'hcm_hr')
  AND option_value IN ('Oracle Higher Ed / PeopleSoft', 'Oracle Peoplesoft', 'Oracle PeopleSoft');
