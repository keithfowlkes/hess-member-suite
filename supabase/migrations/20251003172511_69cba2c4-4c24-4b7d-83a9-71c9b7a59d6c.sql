-- Create policy to allow cohort leaders to update profiles of members in their cohorts
-- Cohort leaders can update profiles where the profile's organization matches their cohort

CREATE POLICY "Cohort leaders can update profiles in their cohorts"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.user_cohorts uc ON uc.user_id = ur.user_id
    JOIN public.organizations o ON o.contact_person_id = profiles.id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'cohort_leader'
      AND (
        uc.cohort = o.student_information_system
        OR uc.cohort = o.financial_system
        OR uc.cohort = o.financial_aid
        OR uc.cohort = o.hcm_hr
        OR uc.cohort = o.payroll_system
        OR uc.cohort = o.purchasing_system
        OR uc.cohort = o.housing_management
        OR uc.cohort = o.learning_management
        OR uc.cohort = o.admissions_crm
        OR uc.cohort = o.alumni_advancement_crm
        OR uc.cohort = o.payment_platform
        OR uc.cohort = o.meal_plan_management
        OR uc.cohort = o.identity_management
        OR uc.cohort = o.door_access
        OR uc.cohort = o.document_management
        OR uc.cohort = o.voip
        OR uc.cohort = o.network_infrastructure
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.user_cohorts uc ON uc.user_id = ur.user_id
    JOIN public.organizations o ON o.contact_person_id = profiles.id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'cohort_leader'
      AND (
        uc.cohort = o.student_information_system
        OR uc.cohort = o.financial_system
        OR uc.cohort = o.financial_aid
        OR uc.cohort = o.hcm_hr
        OR uc.cohort = o.payroll_system
        OR uc.cohort = o.purchasing_system
        OR uc.cohort = o.housing_management
        OR uc.cohort = o.learning_management
        OR uc.cohort = o.admissions_crm
        OR uc.cohort = o.alumni_advancement_crm
        OR uc.cohort = o.payment_platform
        OR uc.cohort = o.meal_plan_management
        OR uc.cohort = o.identity_management
        OR uc.cohort = o.door_access
        OR uc.cohort = o.document_management
        OR uc.cohort = o.voip
        OR uc.cohort = o.network_infrastructure
      )
  )
);