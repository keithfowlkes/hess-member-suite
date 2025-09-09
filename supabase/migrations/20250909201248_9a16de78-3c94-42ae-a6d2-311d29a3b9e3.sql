-- Create table for organization profile edit requests
CREATE TABLE public.organization_profile_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  original_organization_data jsonb NOT NULL,
  updated_organization_data jsonb NOT NULL,
  original_profile_data jsonb,
  updated_profile_data jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_profile_edit_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all profile edit requests" 
ON public.organization_profile_edit_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own organization's edit requests" 
ON public.organization_profile_edit_requests 
FOR SELECT 
USING (
  organization_id IN (
    SELECT o.id 
    FROM organizations o
    JOIN profiles p ON p.id = o.contact_person_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create edit requests for their organization" 
ON public.organization_profile_edit_requests 
FOR INSERT 
WITH CHECK (
  requested_by = auth.uid() AND
  organization_id IN (
    SELECT o.id 
    FROM organizations o
    JOIN profiles p ON p.id = o.contact_person_id
    WHERE p.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_organization_profile_edit_requests_updated_at
BEFORE UPDATE ON public.organization_profile_edit_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();