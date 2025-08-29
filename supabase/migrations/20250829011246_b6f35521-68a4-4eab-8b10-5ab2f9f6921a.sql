-- Remove duplicate organizations
-- Keep one of each and delete the rest

-- For "The HESS Consortium" - keep one active, remove duplicates
DELETE FROM organizations 
WHERE id IN ('866a23fa-caf3-468e-b575-133cc09dee03', 'cbe109ab-5add-4957-b8ec-f41bf1a186dd')
AND name = 'The HESS Consortium';

-- For "Lasell University" - keep one active, remove duplicate  
DELETE FROM organizations 
WHERE id = 'a346873f-237c-471d-97d4-452fa66b264b'
AND name = 'Lasell University';

-- For "TEST COLLEGE" - keep pending, remove cancelled
DELETE FROM organizations 
WHERE id = '390c3eab-03a1-43b4-95bb-841c3717328b'
AND name = 'TEST COLLEGE'
AND membership_status = 'cancelled';

-- Add unique constraint on organization name to prevent future duplicates
-- This will enforce that each organization name can only exist once
ALTER TABLE organizations 
ADD CONSTRAINT unique_organization_name 
UNIQUE (name);