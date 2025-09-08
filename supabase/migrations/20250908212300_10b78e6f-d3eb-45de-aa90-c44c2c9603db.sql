-- Add custom_entries table to track user-submitted "other" values for software systems
CREATE TABLE IF NOT EXISTS public.custom_software_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  custom_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_software_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage custom entries"
ON public.custom_software_entries
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Organizations can view their custom entries"
ON public.custom_software_entries
FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM public.organizations 
    WHERE contact_person_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Organizations can create custom entries"
ON public.custom_software_entries
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT id FROM public.organizations 
    WHERE contact_person_id IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_software_entries_updated_at
BEFORE UPDATE ON public.custom_software_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_custom_software_entries_org_field ON public.custom_software_entries(organization_id, field_name);
CREATE INDEX idx_custom_software_entries_status ON public.custom_software_entries(status);