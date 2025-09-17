-- Fix DeusLogic organization status that got stuck in pending
UPDATE organizations 
SET 
  membership_status = 'active',
  membership_start_date = CURRENT_DATE,
  updated_at = NOW()
WHERE name = 'DeusLogic, Inc.' AND membership_status = 'pending';