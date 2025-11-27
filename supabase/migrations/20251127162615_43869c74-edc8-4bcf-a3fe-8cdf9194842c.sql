-- Fix the refresh function to use UPSERT to prevent duplicate key errors
CREATE OR REPLACE FUNCTION public.refresh_analytics_datacube_sql()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_orgs INTEGER;
  total_fte INTEGER;
BEGIN
  -- Use TRUNCATE for atomic clear (faster and prevents race conditions)
  TRUNCATE system_analytics_datacube;
  
  -- Count ONLY member organizations (or null for legacy), do NOT filter by name
  SELECT COUNT(*), COALESCE(SUM(student_fte), 0)
  INTO total_orgs, total_fte
  FROM organizations 
  WHERE membership_status = 'active' 
    AND (organization_type = 'member' OR organization_type IS NULL);
  
  INSERT INTO system_analytics_datacube (system_field, system_name, institution_count)
  VALUES 
    ('organization_totals', 'total_organizations', total_orgs),
    ('organization_totals', 'total_student_fte', total_fte)
  ON CONFLICT (system_field, system_name) DO UPDATE SET 
    institution_count = EXCLUDED.institution_count,
    last_updated = now();
  
  -- Insert system counts with ON CONFLICT handling
  INSERT INTO system_analytics_datacube (system_field, system_name, institution_count)
  SELECT field, value, cnt::integer
  FROM (
    SELECT 'student_information_system' as field, student_information_system as value, COUNT(*) as cnt
    FROM organizations 
    WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND student_information_system IS NOT NULL AND student_information_system != ''
    GROUP BY student_information_system
    UNION ALL
    SELECT 'financial_system', financial_system, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND financial_system IS NOT NULL AND financial_system != '' GROUP BY financial_system
    UNION ALL
    SELECT 'financial_aid', financial_aid, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND financial_aid IS NOT NULL AND financial_aid != '' GROUP BY financial_aid
    UNION ALL
    SELECT 'hcm_hr', hcm_hr, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND hcm_hr IS NOT NULL AND hcm_hr != '' GROUP BY hcm_hr
    UNION ALL
    SELECT 'payroll_system', payroll_system, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND payroll_system IS NOT NULL AND payroll_system != '' GROUP BY payroll_system
    UNION ALL
    SELECT 'purchasing_system', purchasing_system, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND purchasing_system IS NOT NULL AND purchasing_system != '' GROUP BY purchasing_system
    UNION ALL
    SELECT 'housing_management', housing_management, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND housing_management IS NOT NULL AND housing_management != '' GROUP BY housing_management
    UNION ALL
    SELECT 'learning_management', learning_management, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND learning_management IS NOT NULL AND learning_management != '' GROUP BY learning_management
    UNION ALL
    SELECT 'admissions_crm', admissions_crm, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND admissions_crm IS NOT NULL AND admissions_crm != '' GROUP BY admissions_crm
    UNION ALL
    SELECT 'alumni_advancement_crm', alumni_advancement_crm, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND alumni_advancement_crm IS NOT NULL AND alumni_advancement_crm != '' GROUP BY alumni_advancement_crm
    UNION ALL
    SELECT 'payment_platform', payment_platform, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND payment_platform IS NOT NULL AND payment_platform != '' GROUP BY payment_platform
    UNION ALL
    SELECT 'meal_plan_management', meal_plan_management, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND meal_plan_management IS NOT NULL AND meal_plan_management != '' GROUP BY meal_plan_management
    UNION ALL
    SELECT 'identity_management', identity_management, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND identity_management IS NOT NULL AND identity_management != '' GROUP BY identity_management
    UNION ALL
    SELECT 'door_access', door_access, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND door_access IS NOT NULL AND door_access != '' GROUP BY door_access
    UNION ALL
    SELECT 'document_management', document_management, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND document_management IS NOT NULL AND document_management != '' GROUP BY document_management
    UNION ALL
    SELECT 'voip', voip, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND voip IS NOT NULL AND voip != '' GROUP BY voip
    UNION ALL
    SELECT 'network_infrastructure', network_infrastructure, COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL)
      AND network_infrastructure IS NOT NULL AND network_infrastructure != '' GROUP BY network_infrastructure
  ) system_counts
  ON CONFLICT (system_field, system_name) DO UPDATE SET 
    institution_count = EXCLUDED.institution_count,
    last_updated = now();
  
  -- Insert hardware counts with ON CONFLICT handling
  INSERT INTO system_analytics_datacube (system_field, system_name, institution_count)
  SELECT 'primary_office_hardware', hardware_name, cnt::integer
  FROM (
    SELECT 'Apple' as hardware_name, COUNT(*) as cnt
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL) AND primary_office_apple = true
    UNION ALL
    SELECT 'Lenovo', COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL) AND primary_office_lenovo = true
    UNION ALL
    SELECT 'Dell', COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL) AND primary_office_dell = true
    UNION ALL
    SELECT 'Hp', COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL) AND primary_office_hp = true
    UNION ALL
    SELECT 'Microsoft', COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL) AND primary_office_microsoft = true
    UNION ALL
    SELECT 'Other', COUNT(*)
    FROM organizations WHERE membership_status = 'active' AND (organization_type = 'member' OR organization_type IS NULL) AND primary_office_other = true
  ) hardware_counts
  WHERE cnt > 0
  ON CONFLICT (system_field, system_name) DO UPDATE SET 
    institution_count = EXCLUDED.institution_count,
    last_updated = now();
    
  -- Clean up any zero-count entries
  DELETE FROM system_analytics_datacube WHERE institution_count = 0;
END;
$$;