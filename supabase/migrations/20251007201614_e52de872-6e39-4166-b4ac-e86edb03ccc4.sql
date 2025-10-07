-- Drop the problematic policy
DROP POLICY IF EXISTS "Cohort leaders can update profiles in their cohorts" ON profiles;

-- Create a security definer function to check cohort leader access without recursion
CREATE OR REPLACE FUNCTION public.cohort_leader_can_update_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_cohorts TEXT[];
  profile_org_id uuid;
BEGIN
  -- Get all cohorts for the current user where they are a cohort leader
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
  
  -- Check if any organization linked to this profile has systems matching the user's cohorts
  RETURN EXISTS (
    SELECT 1
    FROM organizations o
    WHERE o.contact_person_id = _profile_id
      AND (
        o.student_information_system = ANY(user_cohorts) OR
        o.financial_system = ANY(user_cohorts) OR
        o.financial_aid = ANY(user_cohorts) OR
        o.hcm_hr = ANY(user_cohorts) OR
        o.payroll_system = ANY(user_cohorts) OR
        o.purchasing_system = ANY(user_cohorts) OR
        o.housing_management = ANY(user_cohorts) OR
        o.learning_management = ANY(user_cohorts) OR
        o.admissions_crm = ANY(user_cohorts) OR
        o.alumni_advancement_crm = ANY(user_cohorts) OR
        o.payment_platform = ANY(user_cohorts) OR
        o.meal_plan_management = ANY(user_cohorts) OR
        o.identity_management = ANY(user_cohorts) OR
        o.door_access = ANY(user_cohorts) OR
        o.document_management = ANY(user_cohorts) OR
        o.voip = ANY(user_cohorts) OR
        o.network_infrastructure = ANY(user_cohorts)
      )
  );
END;
$$;

-- Create new policy using the security definer function
CREATE POLICY "Cohort leaders can update profiles in their cohorts" 
ON profiles 
FOR UPDATE
USING (cohort_leader_can_update_profile(id))
WITH CHECK (cohort_leader_can_update_profile(id));