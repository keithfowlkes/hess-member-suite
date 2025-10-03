-- Drop and recreate the cohort leader policies with Ellucian Banner/Colleague cross-access
DROP POLICY IF EXISTS "Cohort leaders can update organizations in their cohorts" ON organizations;
DROP POLICY IF EXISTS "Cohort leaders can view organizations in their cohorts" ON organizations;

-- Helper function to check if user can access organization based on cohort
CREATE OR REPLACE FUNCTION public.cohort_leader_can_access_org(
  org_student_system TEXT,
  org_financial_system TEXT,
  org_financial_aid TEXT,
  org_hcm_hr TEXT,
  org_payroll_system TEXT,
  org_purchasing_system TEXT,
  org_housing_management TEXT,
  org_learning_management TEXT,
  org_admissions_crm TEXT,
  org_alumni_advancement_crm TEXT,
  org_payment_platform TEXT,
  org_meal_plan_management TEXT,
  org_identity_management TEXT,
  org_door_access TEXT,
  org_document_management TEXT,
  org_voip TEXT,
  org_network_infrastructure TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_cohorts TEXT[];
  is_ellucian_leader BOOLEAN;
BEGIN
  -- Get all cohorts for this user where they are a cohort leader
  SELECT ARRAY_AGG(uc.cohort)
  INTO user_cohorts
  FROM user_cohorts uc
  JOIN user_roles ur ON ur.user_id = uc.user_id
  WHERE ur.user_id = auth.uid()
    AND ur.role = 'cohort_leader';
  
  -- If no cohorts, return false
  IF user_cohorts IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is an Ellucian cohort leader
  is_ellucian_leader := 'Ellucian Banner' = ANY(user_cohorts) OR 'Ellucian Colleague' = ANY(user_cohorts);
  
  -- If Ellucian leader, add both Banner and Colleague to allowed cohorts
  IF is_ellucian_leader THEN
    user_cohorts := array_append(user_cohorts, 'Ellucian Banner');
    user_cohorts := array_append(user_cohorts, 'Ellucian Colleague');
  END IF;
  
  -- Check if any of the organization's systems match the user's cohorts
  RETURN (
    org_student_system = ANY(user_cohorts) OR
    org_financial_system = ANY(user_cohorts) OR
    org_financial_aid = ANY(user_cohorts) OR
    org_hcm_hr = ANY(user_cohorts) OR
    org_payroll_system = ANY(user_cohorts) OR
    org_purchasing_system = ANY(user_cohorts) OR
    org_housing_management = ANY(user_cohorts) OR
    org_learning_management = ANY(user_cohorts) OR
    org_admissions_crm = ANY(user_cohorts) OR
    org_alumni_advancement_crm = ANY(user_cohorts) OR
    org_payment_platform = ANY(user_cohorts) OR
    org_meal_plan_management = ANY(user_cohorts) OR
    org_identity_management = ANY(user_cohorts) OR
    org_door_access = ANY(user_cohorts) OR
    org_document_management = ANY(user_cohorts) OR
    org_voip = ANY(user_cohorts) OR
    org_network_infrastructure = ANY(user_cohorts)
  );
END;
$$;

-- Create SELECT policy using the function
CREATE POLICY "Cohort leaders can view organizations in their cohorts"
ON organizations
FOR SELECT
USING (
  public.cohort_leader_can_access_org(
    student_information_system,
    financial_system,
    financial_aid,
    hcm_hr,
    payroll_system,
    purchasing_system,
    housing_management,
    learning_management,
    admissions_crm,
    alumni_advancement_crm,
    payment_platform,
    meal_plan_management,
    identity_management,
    door_access,
    document_management,
    voip,
    network_infrastructure
  )
);

-- Create UPDATE policy using the function
CREATE POLICY "Cohort leaders can update organizations in their cohorts"
ON organizations
FOR UPDATE
USING (
  public.cohort_leader_can_access_org(
    student_information_system,
    financial_system,
    financial_aid,
    hcm_hr,
    payroll_system,
    purchasing_system,
    housing_management,
    learning_management,
    admissions_crm,
    alumni_advancement_crm,
    payment_platform,
    meal_plan_management,
    identity_management,
    door_access,
    document_management,
    voip,
    network_infrastructure
  )
)
WITH CHECK (
  public.cohort_leader_can_access_org(
    student_information_system,
    financial_system,
    financial_aid,
    hcm_hr,
    payroll_system,
    purchasing_system,
    housing_management,
    learning_management,
    admissions_crm,
    alumni_advancement_crm,
    payment_platform,
    meal_plan_management,
    identity_management,
    door_access,
    document_management,
    voip,
    network_infrastructure
  )
);