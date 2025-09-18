-- Clean up leftover reassignment records in correct order
-- First, find and delete reassignment requests that reference placeholder organizations
DELETE FROM organization_reassignment_requests 
WHERE organization_id IN (
  SELECT id FROM organizations 
  WHERE name LIKE '%__reassign_%' 
    AND membership_status = 'pending'
);

-- Now safely delete the reassignment placeholder organizations
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
    'description', 'Cleaned up leftover reassignment placeholders, requests, and old rejected registrations',
    'timestamp', NOW()
  )
);