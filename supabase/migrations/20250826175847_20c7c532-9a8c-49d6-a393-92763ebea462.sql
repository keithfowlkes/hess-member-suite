-- Create a table to store form field configurations
CREATE TABLE public.form_field_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'number', 'password')),
  section TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('required', 'optional', 'hidden')),
  placeholder TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.form_field_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage form field configurations
CREATE POLICY "Admins can manage form field configurations" 
ON public.form_field_configurations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_form_field_configurations_updated_at
BEFORE UPDATE ON public.form_field_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default form field configurations
INSERT INTO public.form_field_configurations (field_id, field_name, field_label, field_type, section, visibility, placeholder, display_order, is_custom) VALUES
-- Organization Information
('organization', 'organization', 'Organization', 'text', 'Organization Information', 'required', 'Organization name', 1, false),
('stateAssociation', 'stateAssociation', 'State Association', 'text', 'Organization Information', 'optional', 'State association', 2, false),
('studentFte', 'studentFte', 'Student FTE', 'number', 'Organization Information', 'optional', 'Student FTE', 3, false),
('address', 'address', 'Address', 'text', 'Organization Information', 'optional', 'Street address', 4, false),
('city', 'city', 'City', 'text', 'Organization Information', 'optional', 'City', 5, false),
('state', 'state', 'State', 'text', 'Organization Information', 'optional', 'State', 6, false),
('zip', 'zip', 'ZIP Code', 'text', 'Organization Information', 'optional', 'ZIP code', 7, false),

-- Primary Contact
('firstName', 'firstName', 'First Name - Primary Contact', 'text', 'Primary Contact', 'required', 'First name', 8, false),
('lastName', 'lastName', 'Last Name - Primary Contact', 'text', 'Primary Contact', 'required', 'Last name', 9, false),
('primaryContactTitle', 'primaryContactTitle', 'Primary Contact Title', 'text', 'Primary Contact', 'optional', 'Job title', 10, false),
('email', 'email', 'Primary Email', 'email', 'Primary Contact', 'required', 'Enter your email', 11, false),
('password', 'password', 'Password', 'password', 'Primary Contact', 'required', 'Create a password', 12, false),

-- Secondary Contact
('secondaryFirstName', 'secondaryFirstName', 'First Name - Secondary Contact', 'text', 'Secondary Contact', 'optional', 'First name', 13, false),
('secondaryLastName', 'secondaryLastName', 'Last Name - Secondary Contact', 'text', 'Secondary Contact', 'optional', 'Last name', 14, false),
('secondaryContactTitle', 'secondaryContactTitle', 'Secondary Contact Title', 'text', 'Secondary Contact', 'optional', 'Job title', 15, false),
('secondaryContactEmail', 'secondaryContactEmail', 'Secondary Contact Email', 'email', 'Secondary Contact', 'optional', 'Secondary contact email', 16, false),

-- Systems Information
('studentInformationSystem', 'studentInformationSystem', 'Student Information System', 'text', 'Systems Information', 'optional', 'Student information system', 17, false),
('financialSystem', 'financialSystem', 'Financial System', 'text', 'Systems Information', 'optional', 'Financial system', 18, false),
('financialAid', 'financialAid', 'Financial Aid', 'text', 'Systems Information', 'optional', 'Financial aid system', 19, false),
('hcmHr', 'hcmHr', 'HCM (HR)', 'text', 'Systems Information', 'optional', 'HCM/HR system', 20, false),
('payrollSystem', 'payrollSystem', 'Payroll System', 'text', 'Systems Information', 'optional', 'Payroll system', 21, false),
('purchasingSystem', 'purchasingSystem', 'Purchasing System', 'text', 'Systems Information', 'optional', 'Purchasing system', 22, false),
('housingManagement', 'housingManagement', 'Housing Management', 'text', 'Systems Information', 'optional', 'Housing management system', 23, false),
('learningManagement', 'learningManagement', 'Learning Management', 'text', 'Systems Information', 'optional', 'Learning management system', 24, false),
('admissionsCrm', 'admissionsCrm', 'Admissions CRM', 'text', 'Systems Information', 'optional', 'Admissions CRM system', 25, false),
('alumniAdvancementCrm', 'alumniAdvancementCrm', 'Alumni/Advancement CRM', 'text', 'Systems Information', 'optional', 'Alumni/Advancement CRM system', 26, false);