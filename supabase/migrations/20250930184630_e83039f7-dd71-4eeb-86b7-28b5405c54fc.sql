-- Add VoIP and Network Infrastructure fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS voip text,
ADD COLUMN IF NOT EXISTS network_infrastructure text;

-- Add VoIP and Network Infrastructure fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS voip text,
ADD COLUMN IF NOT EXISTS network_infrastructure text;

-- Add VoIP and Network Infrastructure fields to pending_registrations table
ALTER TABLE public.pending_registrations
ADD COLUMN IF NOT EXISTS voip text,
ADD COLUMN IF NOT EXISTS network_infrastructure text;

-- Add VoIP and Network Infrastructure fields to member_registration_updates table
ALTER TABLE public.member_registration_updates
ADD COLUMN IF NOT EXISTS voip text,
ADD COLUMN IF NOT EXISTS network_infrastructure text;