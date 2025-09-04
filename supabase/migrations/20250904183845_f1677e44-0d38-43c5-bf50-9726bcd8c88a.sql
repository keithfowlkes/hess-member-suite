-- Re-process approved registrations by resetting their status so they can be approved again
UPDATE pending_registrations 
SET approval_status = 'pending', approved_by = NULL, approved_at = NULL
WHERE approval_status = 'approved' 
AND email IN ('u@deuslogic.com', 'jkfowlkes@gmail.com');