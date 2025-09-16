-- Create the simplified member registration updates table
CREATE TABLE public.member_registration_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic metadata
  submitted_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Complete registration data (user info)
  registration_data JSONB NOT NULL DEFAULT '{}',
  
  -- Complete organization data
  organization_data JSONB NOT NULL DEFAULT '{}',
  
  -- Optional: organization lookup info for matching existing organizations
  existing_organization_id UUID,
  existing_organization_name TEXT,
  
  -- Submission type to differentiate between new registrations and updates
  submission_type TEXT NOT NULL DEFAULT 'member_update' CHECK (submission_type IN ('new_member', 'member_update', 'primary_contact_change'))
);

-- Enable RLS
ALTER TABLE public.member_registration_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all registration updates" 
ON public.member_registration_updates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can submit registration updates" 
ON public.member_registration_updates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Submitters can view their own registration updates" 
ON public.member_registration_updates 
FOR SELECT 
USING (submitted_email IN (
  SELECT email FROM profiles WHERE user_id = auth.uid()
) OR has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_member_registration_updates_updated_at
  BEFORE UPDATE ON public.member_registration_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();