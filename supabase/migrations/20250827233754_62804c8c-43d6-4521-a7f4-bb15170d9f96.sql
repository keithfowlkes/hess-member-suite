-- Create a placeholder profile by updating the existing user's data instead of deleting
UPDATE public.profiles 
SET 
    first_name = 'Needs',
    last_name = 'Update',
    email = 'noreply@noreply.org',
    updated_at = now()
WHERE user_id = 'ae1f2cc8-d0a7-421d-8f1b-4900d2523841';

-- Delete the user roles to deactivate the account
DELETE FROM public.user_roles 
WHERE user_id = 'ae1f2cc8-d0a7-421d-8f1b-4900d2523841';

-- Verify the organization now has the placeholder contact
SELECT 
    o.name as organization,
    p.first_name,
    p.last_name,
    p.email,
    p.user_id
FROM organizations o
JOIN profiles p ON p.id = o.contact_person_id
WHERE o.id = '0ab64833-f025-41c5-af24-0a0346b59205';