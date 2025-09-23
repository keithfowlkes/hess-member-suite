-- Add organizations' primary contacts to cohorts based on their financial systems

-- Add Anthology financial system users to Anthology cohort
INSERT INTO user_cohorts (user_id, cohort)
SELECT DISTINCT p.user_id, 'Anthology'
FROM organizations o
JOIN profiles p ON o.contact_person_id = p.id
WHERE o.financial_system = 'Anthology'
  AND o.membership_status = 'active'
  AND o.organization_type = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM user_cohorts uc 
    WHERE uc.user_id = p.user_id 
    AND uc.cohort = 'Anthology'
  );

-- Add Workday financial system users to Workday cohort
INSERT INTO user_cohorts (user_id, cohort)
SELECT DISTINCT p.user_id, 'Workday'
FROM organizations o
JOIN profiles p ON o.contact_person_id = p.id
WHERE o.financial_system = 'Workday'
  AND o.membership_status = 'active'
  AND o.organization_type = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM user_cohorts uc 
    WHERE uc.user_id = p.user_id 
    AND uc.cohort = 'Workday'
  );

-- Add financial systems containing "Jenzabar" to Jenzabar ONE cohort
INSERT INTO user_cohorts (user_id, cohort)
SELECT DISTINCT p.user_id, 'Jenzabar ONE'
FROM organizations o
JOIN profiles p ON o.contact_person_id = p.id
WHERE o.financial_system ILIKE '%Jenzabar%'
  AND o.membership_status = 'active'
  AND o.organization_type = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM user_cohorts uc 
    WHERE uc.user_id = p.user_id 
    AND uc.cohort = 'Jenzabar ONE'
  );