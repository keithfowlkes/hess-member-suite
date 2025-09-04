-- Delete the existing pending registration so a new one can be created
DELETE FROM pending_registrations 
WHERE email = 'keith.fowlkes@higheredcommunities.org';