-- Reset the registration status so it can be approved again with the fixed approval function
UPDATE pending_registrations 
SET approval_status = 'pending', 
    approved_by = NULL, 
    approved_at = NULL 
WHERE id = '16da1c15-5bfe-47fb-8af5-efe4f22588b7';