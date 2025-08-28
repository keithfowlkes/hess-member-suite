-- Make requested_by nullable to allow reassignment requests during registration
ALTER TABLE public.organization_reassignment_requests 
ALTER COLUMN requested_by DROP NOT NULL;