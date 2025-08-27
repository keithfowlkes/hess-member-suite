-- Add is_private_nonprofit field to profiles table to track eligibility
ALTER TABLE public.profiles ADD COLUMN is_private_nonprofit boolean DEFAULT false;

-- Create organization_invitations table for managing invitations to existing orgs
CREATE TABLE public.organization_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invitation_token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on organization_invitations
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_invitations
CREATE POLICY "Admins can manage all invitations"
  ON public.organization_invitations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create organization_transfer_requests table for handling contact changes
CREATE TABLE public.organization_transfer_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_contact_id uuid REFERENCES public.profiles(id),
  new_contact_email text NOT NULL,
  new_contact_id uuid REFERENCES public.profiles(id),
  transfer_token text NOT NULL UNIQUE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on organization_transfer_requests
ALTER TABLE public.organization_transfer_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_transfer_requests
CREATE POLICY "Admins can manage all transfer requests"
  ON public.organization_transfer_requests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view transfer requests for their email"
  ON public.organization_transfer_requests
  FOR SELECT
  USING (
    new_contact_email IN (
      SELECT email FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Add audit log table for tracking important actions
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit_log
CREATE POLICY "Admins can view audit log"
  ON public.audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update the handle_new_user function to include is_private_nonprofit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'keith.fowlkes@hessconsortium.org' THEN
    user_role := 'admin';
  ELSE
    user_role := 'member';
  END IF;

  -- Insert profile with all the new fields including is_private_nonprofit
  INSERT INTO public.profiles (
    user_id, first_name, last_name, email,
    organization, state_association, student_fte, address, city, state, zip,
    primary_contact_title, secondary_first_name, secondary_last_name,
    secondary_contact_title, secondary_contact_email,
    student_information_system, financial_system, financial_aid, hcm_hr,
    payroll_system, purchasing_system, housing_management, learning_management,
    admissions_crm, alumni_advancement_crm, primary_office_apple,
    primary_office_asus, primary_office_dell, primary_office_hp,
    primary_office_microsoft, primary_office_other, primary_office_other_details,
    other_software_comments, is_private_nonprofit
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'organization', ''),
    COALESCE(NEW.raw_user_meta_data->>'state_association', ''),
    COALESCE((NEW.raw_user_meta_data->>'student_fte')::INTEGER, NULL),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'zip', ''),
    COALESCE(NEW.raw_user_meta_data->>'primary_contact_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_contact_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'secondary_contact_email', ''),
    COALESCE(NEW.raw_user_meta_data->>'student_information_system', ''),
    COALESCE(NEW.raw_user_meta_data->>'financial_system', ''),
    COALESCE(NEW.raw_user_meta_data->>'financial_aid', ''),
    COALESCE(NEW.raw_user_meta_data->>'hcm_hr', ''),
    COALESCE(NEW.raw_user_meta_data->>'payroll_system', ''),
    COALESCE(NEW.raw_user_meta_data->>'purchasing_system', ''),
    COALESCE(NEW.raw_user_meta_data->>'housing_management', ''),
    COALESCE(NEW.raw_user_meta_data->>'learning_management', ''),
    COALESCE(NEW.raw_user_meta_data->>'admissions_crm', ''),
    COALESCE(NEW.raw_user_meta_data->>'alumni_advancement_crm', ''),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_apple')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_asus')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_dell')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_hp')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_microsoft')::BOOLEAN, FALSE),
    COALESCE((NEW.raw_user_meta_data->>'primary_office_other')::BOOLEAN, FALSE),
    COALESCE(NEW.raw_user_meta_data->>'primary_office_other_details', ''),
    COALESCE(NEW.raw_user_meta_data->>'other_software_comments', ''),
    COALESCE((NEW.raw_user_meta_data->>'isPrivateNonProfit')::BOOLEAN, FALSE)
  );
  
  -- Assign appropriate role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$function$;

-- Create function to generate secure tokens
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS text
LANGUAGE sql
AS $$
  SELECT encode(gen_random_bytes(32), 'base64url');
$$;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_organization_invitations_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_transfer_requests_updated_at
  BEFORE UPDATE ON public.organization_transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();