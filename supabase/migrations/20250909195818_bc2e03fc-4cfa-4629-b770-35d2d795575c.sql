-- Insert Primary Office Hardware analytics data
WITH hardware_counts AS (
  SELECT 'Apple' as hardware, COUNT(*) as cnt FROM organizations WHERE membership_status = 'active' AND primary_office_apple = true
  UNION ALL
  SELECT 'Microsoft' as hardware, COUNT(*) as cnt FROM organizations WHERE membership_status = 'active' AND primary_office_microsoft = true  
  UNION ALL
  SELECT 'Dell' as hardware, COUNT(*) as cnt FROM organizations WHERE membership_status = 'active' AND primary_office_dell = true
  UNION ALL
  SELECT 'HP' as hardware, COUNT(*) as cnt FROM organizations WHERE membership_status = 'active' AND primary_office_hp = true
  UNION ALL
  SELECT 'Asus' as hardware, COUNT(*) as cnt FROM organizations WHERE membership_status = 'active' AND primary_office_asus = true
  UNION ALL
  SELECT 'Other' as hardware, COUNT(*) as cnt FROM organizations WHERE membership_status = 'active' AND primary_office_other = true
)
INSERT INTO system_analytics_datacube (system_field, system_name, institution_count)
SELECT 'primary_office_hardware', hardware, cnt
FROM hardware_counts
WHERE cnt > 0;