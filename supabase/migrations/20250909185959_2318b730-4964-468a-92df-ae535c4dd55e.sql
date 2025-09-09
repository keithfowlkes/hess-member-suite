-- Create cron job to refresh analytics datacube every hour
SELECT cron.schedule(
  'refresh-analytics-datacube',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url := 'https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/refresh-analytics-datacube',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Initial population of the datacube (run once)
INSERT INTO public.system_analytics_datacube (system_field, system_name, institution_count)
SELECT 
  'student_information_system' as system_field,
  student_information_system as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND student_information_system IS NOT NULL 
  AND student_information_system != ''
GROUP BY student_information_system

UNION ALL

SELECT 
  'financial_system' as system_field,
  financial_system as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND financial_system IS NOT NULL 
  AND financial_system != ''
GROUP BY financial_system

UNION ALL

SELECT 
  'learning_management' as system_field,
  learning_management as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND learning_management IS NOT NULL 
  AND learning_management != ''
GROUP BY learning_management

UNION ALL

SELECT 
  'financial_aid' as system_field,
  financial_aid as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND financial_aid IS NOT NULL 
  AND financial_aid != ''
GROUP BY financial_aid

UNION ALL

SELECT 
  'hcm_hr' as system_field,
  hcm_hr as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND hcm_hr IS NOT NULL 
  AND hcm_hr != ''
GROUP BY hcm_hr

UNION ALL

SELECT 
  'payroll_system' as system_field,
  payroll_system as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND payroll_system IS NOT NULL 
  AND payroll_system != ''
GROUP BY payroll_system

UNION ALL

SELECT 
  'housing_management' as system_field,
  housing_management as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND housing_management IS NOT NULL 
  AND housing_management != ''
GROUP BY housing_management

UNION ALL

SELECT 
  'admissions_crm' as system_field,
  admissions_crm as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND admissions_crm IS NOT NULL 
  AND admissions_crm != ''
GROUP BY admissions_crm

UNION ALL

SELECT 
  'alumni_advancement_crm' as system_field,
  alumni_advancement_crm as system_name,
  COUNT(*) as institution_count
FROM public.organizations 
WHERE membership_status = 'active' 
  AND name != 'Administrator'
  AND alumni_advancement_crm IS NOT NULL 
  AND alumni_advancement_crm != ''
GROUP BY alumni_advancement_crm;