-- Try to insert a test record to see if it works
INSERT INTO organization_reassignment_requests (
    organization_id,
    new_contact_email,
    new_organization_data,
    status
) VALUES (
    '9b4ab377-f9d0-4303-9077-6e54f003af29'::uuid,
    'test@example.com',
    '{"test": "data"}'::jsonb,
    'pending'
);