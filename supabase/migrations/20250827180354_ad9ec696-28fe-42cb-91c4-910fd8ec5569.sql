-- Create table for storing system field dropdown options
CREATE TABLE public.system_field_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name TEXT NOT NULL,
  option_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(field_name, option_value)
);

-- Enable Row Level Security
ALTER TABLE public.system_field_options ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage all system field options" 
ON public.system_field_options 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_field_options_updated_at
BEFORE UPDATE ON public.system_field_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some common default values to populate dropdowns
INSERT INTO public.system_field_options (field_name, option_value) VALUES
-- Student Information Systems
('student_information_system', 'Banner'),
('student_information_system', 'Colleague'),
('student_information_system', 'PowerCampus'),
('student_information_system', 'Jenzabar'),
('student_information_system', 'Campus Management'),
('student_information_system', 'Workday Student'),

-- Financial Systems
('financial_system', 'Banner Finance'),
('financial_system', 'Colleague Finance'),
('financial_system', 'Jenzabar Finance'),
('financial_system', 'PeopleSoft'),
('financial_system', 'Workday Financial Management'),
('financial_system', 'QuickBooks'),

-- Financial Aid
('financial_aid', 'Banner Financial Aid'),
('financial_aid', 'Colleague Financial Aid'),
('financial_aid', 'PowerFAIDS'),
('financial_aid', 'CampusLogic'),
('financial_aid', 'ScholarshipUniverse'),

-- HCM/HR Systems
('hcm_hr', 'Workday HCM'),
('hcm_hr', 'PeopleSoft HCM'),
('hcm_hr', 'Banner HR'),
('hcm_hr', 'BambooHR'),
('hcm_hr', 'ADP'),
('hcm_hr', 'Paycom'),

-- Payroll Systems
('payroll_system', 'ADP'),
('payroll_system', 'Paycom'),
('payroll_system', 'Workday Payroll'),
('payroll_system', 'PeopleSoft Payroll'),
('payroll_system', 'Banner Payroll'),
('payroll_system', 'Paychex'),

-- Purchasing Systems
('purchasing_system', 'Banner Procurement'),
('purchasing_system', 'PeopleSoft Procurement'),
('purchasing_system', 'Workday Procurement'),
('purchasing_system', 'Jaggaer'),
('purchasing_system', 'Amazon Business'),
('purchasing_system', 'SAP Ariba'),

-- Housing Management
('housing_management', 'StarRez'),
('housing_management', 'RoomKey'),
('housing_management', 'CBord'),
('housing_management', 'AIMS'),
('housing_management', 'Campus Management Housing'),

-- Learning Management Systems
('learning_management', 'Canvas'),
('learning_management', 'Blackboard'),
('learning_management', 'Moodle'),
('learning_management', 'D2L Brightspace'),
('learning_management', 'Google Classroom'),

-- Admissions CRM
('admissions_crm', 'Slate'),
('admissions_crm', 'Salesforce Education Cloud'),
('admissions_crm', 'Radius'),
('admissions_crm', 'Hobsons Connect'),
('admissions_crm', 'CampusNexus CRM'),

-- Alumni/Advancement CRM
('alumni_advancement_crm', 'Raiser\'s Edge'),
('alumni_advancement_crm', 'Advance'),
('alumni_advancement_crm', 'iWave'),
('alumni_advancement_crm', 'DonorSearch'),
('alumni_advancement_crm', 'Salesforce Nonprofit Cloud');