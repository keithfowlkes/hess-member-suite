-- Delete all rejected registrations to allow re-registration for any previously rejected emails
DELETE FROM pending_registrations 
WHERE approval_status = 'rejected';