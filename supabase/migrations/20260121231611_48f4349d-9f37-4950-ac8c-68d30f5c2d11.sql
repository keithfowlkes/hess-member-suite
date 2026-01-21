-- Create table to track partner program interest contacts by cohort leaders
CREATE TABLE public.partner_interest_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_leader_id UUID NOT NULL,
  partner_program TEXT NOT NULL,
  contacted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX idx_partner_interest_contacts_unique 
ON public.partner_interest_contacts (organization_id, cohort_leader_id, partner_program);

-- Enable Row Level Security
ALTER TABLE public.partner_interest_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Cohort leaders can view their own contact records
CREATE POLICY "Cohort leaders can view their own contacts" 
ON public.partner_interest_contacts 
FOR SELECT 
USING (auth.uid() = cohort_leader_id);

-- Policy: Cohort leaders can create their own contact records
CREATE POLICY "Cohort leaders can create their own contacts" 
ON public.partner_interest_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = cohort_leader_id);

-- Policy: Cohort leaders can delete their own contact records
CREATE POLICY "Cohort leaders can delete their own contacts" 
ON public.partner_interest_contacts 
FOR DELETE 
USING (auth.uid() = cohort_leader_id);

-- Policy: Admins can view all contact records
CREATE POLICY "Admins can view all contacts" 
ON public.partner_interest_contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add index for faster lookups
CREATE INDEX idx_partner_interest_contacts_org ON public.partner_interest_contacts (organization_id);
CREATE INDEX idx_partner_interest_contacts_leader ON public.partner_interest_contacts (cohort_leader_id);