-- Normalize all Jenzabar variants to Jenzabar ONE across multiple system fields in organizations table
UPDATE organizations 
SET financial_system = 'Jenzabar ONE',
    updated_at = now()
WHERE financial_system ILIKE '%jenzabar%' 
  AND financial_system != 'Jenzabar ONE';

UPDATE organizations 
SET financial_aid = 'Jenzabar ONE',
    updated_at = now()
WHERE financial_aid ILIKE '%jenzabar%' 
  AND financial_aid != 'Jenzabar ONE';

UPDATE organizations 
SET hcm_hr = 'Jenzabar ONE',
    updated_at = now()
WHERE hcm_hr ILIKE '%jenzabar%' 
  AND hcm_hr != 'Jenzabar ONE';

UPDATE organizations 
SET housing_management = 'Jenzabar ONE',
    updated_at = now()
WHERE housing_management ILIKE '%jenzabar%' 
  AND housing_management != 'Jenzabar ONE';

UPDATE organizations 
SET admissions_crm = 'Jenzabar ONE',
    updated_at = now()
WHERE admissions_crm ILIKE '%jenzabar%' 
  AND admissions_crm != 'Jenzabar ONE';

-- Normalize all Jenzabar variants to Jenzabar ONE across multiple system fields in profiles table
UPDATE profiles 
SET financial_system = 'Jenzabar ONE',
    updated_at = now()
WHERE financial_system ILIKE '%jenzabar%' 
  AND financial_system != 'Jenzabar ONE';

UPDATE profiles 
SET financial_aid = 'Jenzabar ONE',
    updated_at = now()
WHERE financial_aid ILIKE '%jenzabar%' 
  AND financial_aid != 'Jenzabar ONE';

UPDATE profiles 
SET hcm_hr = 'Jenzabar ONE',
    updated_at = now()
WHERE hcm_hr ILIKE '%jenzabar%' 
  AND hcm_hr != 'Jenzabar ONE';

UPDATE profiles 
SET housing_management = 'Jenzabar ONE',
    updated_at = now()
WHERE housing_management ILIKE '%jenzabar%' 
  AND housing_management != 'Jenzabar ONE';

UPDATE profiles 
SET admissions_crm = 'Jenzabar ONE',
    updated_at = now()
WHERE admissions_crm ILIKE '%jenzabar%' 
  AND admissions_crm != 'Jenzabar ONE';