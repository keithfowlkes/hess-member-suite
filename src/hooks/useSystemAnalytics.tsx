import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemUsage {
  name: string;
  count: number;
}

export interface SystemAnalytics {
  studentInformationSystems: SystemUsage[];
  financialSystems: SystemUsage[];
  learningManagementSystems: SystemUsage[];
  financialAidSystems: SystemUsage[];
  hcmSystems: SystemUsage[];
  payrollSystems: SystemUsage[];
  housingManagementSystems: SystemUsage[];
  admissionsCrms: SystemUsage[];
  alumniAdvancementCrms: SystemUsage[];
}

const processSystemData = (data: any[], field: string): SystemUsage[] => {
  const counts: Record<string, number> = {};
  
  data.forEach(org => {
    const value = org[field];
    if (value && value.trim()) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  // Convert to array and group small values into "Other"
  let systemData = Object.entries(counts).map(([name, count]) => ({ name, count }));
  
  // Separate items with count >= 11 and < 11
  const mainItems = systemData.filter(item => item.count >= 11);
  const smallItems = systemData.filter(item => item.count < 11);
  
  // If there are small items, group them into "Other"
  if (smallItems.length > 0) {
    const otherCount = smallItems.reduce((sum, item) => sum + item.count, 0);
    if (otherCount > 0) {
      mainItems.push({ name: 'Other', count: otherCount });
    }
  }
  
  return mainItems.sort((a, b) => b.count - a.count);
};

export const useSystemAnalytics = () => {
  return useQuery({
    queryKey: ['system-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          student_information_system,
          financial_system,
          financial_aid,
          hcm_hr,
          payroll_system,
          housing_management,
          learning_management,
          admissions_crm,
          alumni_advancement_crm
        `)
        .eq('membership_status', 'active')
        .neq('name', 'Administrator');

      if (error) throw error;

      const analytics: SystemAnalytics = {
        studentInformationSystems: processSystemData(data, 'student_information_system'),
        financialSystems: processSystemData(data, 'financial_system'),
        learningManagementSystems: processSystemData(data, 'learning_management'),
        financialAidSystems: processSystemData(data, 'financial_aid'),
        hcmSystems: processSystemData(data, 'hcm_hr'),
        payrollSystems: processSystemData(data, 'payroll_system'),
        housingManagementSystems: processSystemData(data, 'housing_management'),
        admissionsCrms: processSystemData(data, 'admissions_crm'),
        alumniAdvancementCrms: processSystemData(data, 'alumni_advancement_crm'),
      };

      return analytics;
    },
  });
};