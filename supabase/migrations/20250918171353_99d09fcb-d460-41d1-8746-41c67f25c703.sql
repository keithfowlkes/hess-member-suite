-- Fix The Coalition for College Cost Savings organization status
UPDATE organizations 
SET membership_status = 'active',
    membership_start_date = CURRENT_DATE,
    updated_at = NOW()
WHERE name = 'The Coalition for College Cost Savings' 
  AND membership_status = 'pending';