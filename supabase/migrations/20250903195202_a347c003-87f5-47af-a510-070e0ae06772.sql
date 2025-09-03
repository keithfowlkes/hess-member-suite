-- Clean up orphaned pending registration that's causing duplicate email issues
DELETE FROM pending_registrations 
WHERE email = 'keith@hessconsortium.org' 
  AND approval_status = 'approved';