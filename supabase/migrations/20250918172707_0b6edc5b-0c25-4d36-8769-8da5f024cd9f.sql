-- Clean up leftover reassignment placeholder and rejected pending registrations
-- Remove the reassignment placeholder organization that's causing the "New Org" to show
DELETE FROM organizations 
WHERE name LIKE '%__reassign_%' 
  AND membership_status = 'pending';

-- Clean up rejected pending registrations that are no longer needed
DELETE FROM pending_registrations 
WHERE approval_status = 'rejected' 
  AND created_at < NOW() - INTERVAL '7 days';

-- Log cleanup action
INSERT INTO audit_log (action, entity_type, details)
VALUES (
  'cleanup_leftover_records', 
  'system', 
  jsonb_build_object(
    'description', 'Cleaned up leftover reassignment placeholders and old rejected registrations',
    'timestamp', NOW()
  )
);