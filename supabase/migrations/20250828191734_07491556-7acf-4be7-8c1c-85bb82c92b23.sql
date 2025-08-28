-- Make original_organization_data nullable since we don't need it in the simpler approach
ALTER TABLE public.organization_reassignment_requests 
ALTER COLUMN original_organization_data DROP NOT NULL;