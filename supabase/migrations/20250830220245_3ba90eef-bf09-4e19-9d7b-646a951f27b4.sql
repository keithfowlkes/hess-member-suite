-- Add user registration fields to organization_reassignment_requests table
ALTER TABLE public.organization_reassignment_requests 
ADD COLUMN IF NOT EXISTS user_registration_data JSONB;

-- Add comment to explain the new field
COMMENT ON COLUMN public.organization_reassignment_requests.user_registration_data IS 
'Stores the new user registration data (name, password hash, etc.) for creating account after approval';