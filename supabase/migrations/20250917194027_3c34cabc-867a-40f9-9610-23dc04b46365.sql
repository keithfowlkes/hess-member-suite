-- Update the organization name for DeusLogic
UPDATE organizations 
SET name = 'DeusLogic, LLC.' 
WHERE id = 'e992b449-d7f9-42f4-bc86-62f1d757c8a8';

-- Update the profile organization field to match
UPDATE profiles 
SET organization = 'DeusLogic, LLC.' 
WHERE email = 'keith.fowlkes@deuslogic.com';