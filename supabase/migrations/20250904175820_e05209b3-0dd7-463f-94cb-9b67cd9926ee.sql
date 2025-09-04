-- Delete the rejected registration to allow re-registration
DELETE FROM pending_registrations 
WHERE email = 'keith.fowlkes@higheredcommunities.org' 
AND approval_status = 'rejected';