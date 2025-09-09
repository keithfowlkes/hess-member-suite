-- Make organization_id and requested_by required fields for better security
ALTER TABLE organization_profile_edit_requests 
ALTER COLUMN organization_id SET NOT NULL,
ALTER COLUMN requested_by SET NOT NULL;