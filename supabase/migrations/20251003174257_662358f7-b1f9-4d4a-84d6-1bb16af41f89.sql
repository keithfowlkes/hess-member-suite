-- Drop the existing cohort leader update policies to recreate them properly
DROP POLICY IF EXISTS "Cohort leaders can update organizations in their cohorts" ON organizations;

-- Recreate the cohort leader update policy with proper permissions
CREATE POLICY "Cohort leaders can update organizations in their cohorts"
ON organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN user_cohorts uc ON uc.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'cohort_leader'
      AND (
        uc.cohort = organizations.student_information_system
        OR uc.cohort = organizations.financial_system
        OR uc.cohort = organizations.financial_aid
        OR uc.cohort = organizations.hcm_hr
        OR uc.cohort = organizations.payroll_system
        OR uc.cohort = organizations.purchasing_system
        OR uc.cohort = organizations.housing_management
        OR uc.cohort = organizations.learning_management
        OR uc.cohort = organizations.admissions_crm
        OR uc.cohort = organizations.alumni_advancement_crm
        OR uc.cohort = organizations.payment_platform
        OR uc.cohort = organizations.meal_plan_management
        OR uc.cohort = organizations.identity_management
        OR uc.cohort = organizations.door_access
        OR uc.cohort = organizations.document_management
        OR uc.cohort = organizations.voip
        OR uc.cohort = organizations.network_infrastructure
      )
  )
);

-- Add select policy for cohort leaders to view organizations in their cohorts
CREATE POLICY "Cohort leaders can view organizations in their cohorts"
ON organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN user_cohorts uc ON uc.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'cohort_leader'
      AND (
        uc.cohort = organizations.student_information_system
        OR uc.cohort = organizations.financial_system
        OR uc.cohort = organizations.financial_aid
        OR uc.cohort = organizations.hcm_hr
        OR uc.cohort = organizations.payroll_system
        OR uc.cohort = organizations.purchasing_system
        OR uc.cohort = organizations.housing_management
        OR uc.cohort = organizations.learning_management
        OR uc.cohort = organizations.admissions_crm
        OR uc.cohort = organizations.alumni_advancement_crm
        OR uc.cohort = organizations.payment_platform
        OR uc.cohort = organizations.meal_plan_management
        OR uc.cohort = organizations.identity_management
        OR uc.cohort = organizations.door_access
        OR uc.cohort = organizations.document_management
        OR uc.cohort = organizations.voip
        OR uc.cohort = organizations.network_infrastructure
      )
  )
);