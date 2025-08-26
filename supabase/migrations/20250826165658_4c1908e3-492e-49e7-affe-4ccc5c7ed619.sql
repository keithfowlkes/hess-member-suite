-- Create organizations from existing profiles (this will make them visible)
INSERT INTO organizations (name, contact_person_id, email, phone, address_line_1, city, state, zip_code, country, membership_status, annual_fee_amount)
SELECT DISTINCT 
  p.organization,
  p.id,
  p.email,
  p.phone,
  p.address,
  p.city,
  p.state,
  p.zip,
  'United States',
  'active',
  1000.00
FROM profiles p
WHERE p.organization IS NOT NULL 
  AND p.organization != ''
  AND NOT EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.name = p.organization
  );