-- Let's check the details of an approved registration to manually process it
SELECT * FROM pending_registrations 
WHERE email = 'u@deuslogic.com' AND approval_status = 'approved';