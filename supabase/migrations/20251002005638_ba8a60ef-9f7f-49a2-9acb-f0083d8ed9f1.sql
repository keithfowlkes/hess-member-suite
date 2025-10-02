-- Migration to move address and state_association from profiles to organizations

-- Step 1: Add state_association to organizations if it doesn't exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS state_association TEXT;

-- Step 2: Migrate data from profiles to organizations
-- Update organizations with data from their contact person's profile
UPDATE organizations o
SET 
  address_line_1 = COALESCE(o.address_line_1, p.address),
  city = COALESCE(o.city, p.city),
  state = COALESCE(o.state, p.state),
  zip_code = COALESCE(o.zip_code, p.zip),
  state_association = COALESCE(o.state_association, p.state_association)
FROM profiles p
WHERE o.contact_person_id = p.id;

-- Step 3: Drop address and state_association columns from profiles
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS zip,
  DROP COLUMN IF EXISTS state_association;