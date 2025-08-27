-- Add common system field options for better user experience
INSERT INTO public.system_field_options (field_name, option_value) VALUES 
-- Student Information Systems
('student_information_system', 'Banner'),
('student_information_system', 'PeopleSoft'),
('student_information_system', 'Colleague'),
('student_information_system', 'PowerCampus'),
('student_information_system', 'Jenzabar'),
('student_information_system', 'Salesforce'),
('student_information_system', 'Other'),

-- Financial Systems  
('financial_system', 'Oracle Cloud'),
('financial_system', 'Banner Finance'),
('financial_system', 'PeopleSoft'),
('financial_system', 'Colleague'),
('financial_system', 'Workday'),
('financial_system', 'SAP'),
('financial_system', 'Other'),

-- Financial Aid
('financial_aid', 'Banner Financial Aid'),
('financial_aid', 'PowerFAIDS'),
('financial_aid', 'CampusLogic'),
('financial_aid', 'Oracle Cloud'),
('financial_aid', 'Colleague'),
('financial_aid', 'Other'),

-- HCM/HR Systems
('hcm_hr', 'Workday'),
('hcm_hr', 'Oracle Cloud HCM'),
('hcm_hr', 'PeopleSoft HCM'),
('hcm_hr', 'SAP SuccessFactors'),
('hcm_hr', 'BambooHR'),
('hcm_hr', 'ADP'),
('hcm_hr', 'Other'),

-- Payroll Systems
('payroll_system', 'ADP'),
('payroll_system', 'Workday'),
('payroll_system', 'Oracle Cloud Payroll'),
('payroll_system', 'PeopleSoft'),
('payroll_system', 'Paychex'),
('payroll_system', 'Other'),

-- Purchasing Systems
('purchasing_system', 'Oracle Cloud Procurement'),
('purchasing_system', 'SAP Ariba'),
('purchasing_system', 'Workday'),
('purchasing_system', 'Colleague'),
('purchasing_system', 'Banner Finance'),
('purchasing_system', 'Other'),

-- Housing Management
('housing_management', 'eRezLife'),
('housing_management', 'StarRez'),
('housing_management', 'RoomKey'),
('housing_management', 'Campus Housing'),
('housing_management', 'Other'),

-- Learning Management Systems
('learning_management', 'Canvas'),
('learning_management', 'Blackboard'),
('learning_management', 'D2L Brightspace'),
('learning_management', 'Moodle'),
('learning_management', 'Schoology'),
('learning_management', 'Other'),

-- Admissions CRM
('admissions_crm', 'Slate'),
('admissions_crm', 'Salesforce'),
('admissions_crm', 'Ellucian CRM Recruit'),
('admissions_crm', 'TargetX'),
('admissions_crm', 'Hobsons'),
('admissions_crm', 'Other'),

-- Alumni/Advancement CRM
('alumni_advancement_crm', 'Blackbaud Raiser\'s Edge'),
('alumni_advancement_crm', 'Salesforce'),
('alumni_advancement_crm', 'Ellucian Advance'),
('alumni_advancement_crm', 'iWave'),
('alumni_advancement_crm', 'DonorPerfect'),
('alumni_advancement_crm', 'Other')

ON CONFLICT (field_name, option_value) DO NOTHING;