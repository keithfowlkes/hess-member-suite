-- Create pending registrations table to store registration data before organization approval
CREATE TABLE public.pending_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- We'll store bcrypt hash
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  state_association TEXT,
  student_fte INTEGER,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  primary_contact_title TEXT,
  secondary_first_name TEXT,
  secondary_last_name TEXT,
  secondary_contact_title TEXT,
  secondary_contact_email TEXT,
  student_information_system TEXT,
  financial_system TEXT,
  financial_aid TEXT,
  hcm_hr TEXT,
  payroll_system TEXT,
  purchasing_system TEXT,
  housing_management TEXT,
  learning_management TEXT,
  admissions_crm TEXT,
  alumni_advancement_crm TEXT,
  primary_office_apple BOOLEAN DEFAULT FALSE,
  primary_office_asus BOOLEAN DEFAULT FALSE,
  primary_office_dell BOOLEAN DEFAULT FALSE,
  primary_office_hp BOOLEAN DEFAULT FALSE,
  primary_office_microsoft BOOLEAN DEFAULT FALSE,
  primary_office_other BOOLEAN DEFAULT FALSE,
  primary_office_other_details TEXT,
  other_software_comments TEXT,
  is_private_nonprofit BOOLEAN DEFAULT FALSE,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all pending registrations
CREATE POLICY "Admins can manage all pending registrations"
ON public.pending_registrations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_pending_registrations_updated_at
BEFORE UPDATE ON public.pending_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on email for faster lookups
CREATE INDEX idx_pending_registrations_email ON public.pending_registrations(email);
CREATE INDEX idx_pending_registrations_status ON public.pending_registrations(approval_status);