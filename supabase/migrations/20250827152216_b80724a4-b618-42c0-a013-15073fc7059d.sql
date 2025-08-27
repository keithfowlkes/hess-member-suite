-- Create organization reassignment requests table
CREATE TABLE IF NOT EXISTS public.organization_reassignment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  requested_by UUID NOT NULL,
  new_contact_email TEXT NOT NULL,
  new_organization_data JSONB NOT NULL, -- Store all the new organization info
  original_organization_data JSONB NOT NULL, -- Store original info for revert
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reverted')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.organization_reassignment_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all reassignment requests" 
ON public.organization_reassignment_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_organization_reassignment_requests_updated_at
BEFORE UPDATE ON public.organization_reassignment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();