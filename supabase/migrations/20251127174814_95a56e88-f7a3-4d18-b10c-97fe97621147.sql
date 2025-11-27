-- Create external_applications table to register approved external Lovable projects
CREATE TABLE public.external_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  app_url TEXT NOT NULL,
  app_identifier TEXT UNIQUE NOT NULL,
  allowed_scopes TEXT[] DEFAULT ARRAY['profile:read', 'organization:read', 'roles:read'],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create external_app_access_log table for audit trail
CREATE TABLE public.external_app_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES public.external_applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  scopes_requested TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.external_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_app_access_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for external_applications
CREATE POLICY "Admins can manage all external applications"
ON public.external_applications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active applications"
ON public.external_applications
FOR SELECT
USING (is_active = true);

-- RLS policies for external_app_access_log
CREATE POLICY "Admins can view all access logs"
ON public.external_app_access_log
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own access logs"
ON public.external_app_access_log
FOR SELECT
USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_external_applications_updated_at
BEFORE UPDATE ON public.external_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_external_applications_identifier ON public.external_applications(app_identifier);
CREATE INDEX idx_external_app_access_log_app_id ON public.external_app_access_log(app_id);
CREATE INDEX idx_external_app_access_log_user_id ON public.external_app_access_log(user_id);
CREATE INDEX idx_external_app_access_log_created_at ON public.external_app_access_log(created_at DESC);

-- Insert Conference Hub as the first external application
INSERT INTO public.external_applications (name, description, app_url, app_identifier, allowed_scopes, is_active)
VALUES (
  'Conference Hub',
  'HESS Consortium Conference and Event Management Platform',
  'https://conference-hub.lovable.app',
  'conference-hub',
  ARRAY['profile:read', 'organization:read', 'roles:read', 'cohorts:read'],
  true
);