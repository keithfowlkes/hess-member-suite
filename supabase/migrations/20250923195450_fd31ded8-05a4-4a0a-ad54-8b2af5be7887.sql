-- Add all organizations' primary contacts with financial system "Ellucian Banner" to the Ellucian Banner cohort

INSERT INTO user_cohorts (user_id, cohort)
SELECT DISTINCT p.user_id, 'Ellucian Banner'
FROM organizations o
JOIN profiles p ON o.contact_person_id = p.id
WHERE o.financial_system = 'Ellucian Banner'
  AND o.membership_status = 'active'
  AND o.organization_type = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM user_cohorts uc 
    WHERE uc.user_id = p.user_id 
    AND uc.cohort = 'Ellucian Banner'
  );