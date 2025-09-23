-- Add all organizations' primary contacts with financial system "Oracle Cloud" to the Oracle Cloud cohort

INSERT INTO user_cohorts (user_id, cohort)
SELECT DISTINCT p.user_id, 'Oracle Cloud'
FROM organizations o
JOIN profiles p ON o.contact_person_id = p.id
WHERE o.financial_system = 'Oracle Cloud'
  AND o.membership_status = 'active'
  AND o.organization_type = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM user_cohorts uc 
    WHERE uc.user_id = p.user_id 
    AND uc.cohort = 'Oracle Cloud'
  );