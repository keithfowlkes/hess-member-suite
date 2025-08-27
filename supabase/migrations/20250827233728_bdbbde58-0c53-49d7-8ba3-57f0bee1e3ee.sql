-- Create a placeholder profile for organizations that need contact updates
INSERT INTO public.profiles (
    id,
    user_id, 
    first_name, 
    last_name, 
    email,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    gen_random_uuid(), -- Generate a random UUID for user_id since this isn't a real user
    'Needs',
    'Update', 
    'noreply@noreply.org',
    now(),
    now()
) 
ON CONFLICT (user_id) DO NOTHING -- Prevent duplicates if this runs multiple times
RETURNING id as new_profile_id;

-- Get the new profile ID and update Averett University
WITH new_contact AS (
    SELECT id as new_profile_id 
    FROM public.profiles 
    WHERE email = 'noreply@noreply.org' 
    LIMIT 1
)
UPDATE public.organizations 
SET contact_person_id = (SELECT new_profile_id FROM new_contact)
WHERE id = '0ab64833-f025-41c5-af24-0a0346b59205';

-- Now safely delete the old user's data
-- Delete user roles first
DELETE FROM public.user_roles 
WHERE user_id = 'ae1f2cc8-d0a7-421d-8f1b-4900d2523841';

-- Delete the profile
DELETE FROM public.profiles 
WHERE user_id = 'ae1f2cc8-d0a7-421d-8f1b-4900d2523841';

-- Verify the organization now has the placeholder contact
SELECT 
    o.name as organization,
    p.first_name,
    p.last_name,
    p.email
FROM organizations o
JOIN profiles p ON p.id = o.contact_person_id
WHERE o.id = '0ab64833-f025-41c5-af24-0a0346b59205';