-- Activate The Coalition for College Cost Savings organization
UPDATE organizations 
SET membership_status = 'active',
    membership_start_date = CURRENT_DATE,
    updated_at = NOW()
WHERE name = 'The Coalition for College Cost Savings' 
  AND membership_status = 'pending';

-- Log the manual activation
INSERT INTO audit_log (action, entity_type, entity_id, details)
SELECT 
  'organization_manually_activated',
  'organization',
  id,
  jsonb_build_object(
    'organization_name', name,
    'reason', 'Manual activation after successful registration approval',
    'contact_email', email,
    'timestamp', NOW()
  )
FROM organizations 
WHERE name = 'The Coalition for College Cost Savings';