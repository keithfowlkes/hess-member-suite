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
  primaryOfficeHardware: SystemUsage[];
}

const processDatacubeData = (datacubeEntries: Array<{system_field: string, system_name: string, institution_count: number}>, field: string): SystemUsage[] => {
  // Filter entries for this field
  const fieldEntries = datacubeEntries.filter(entry => entry.system_field === field);
  
  // Convert to the expected format
  let systemData = fieldEntries.map(entry => ({ 
    name: entry.system_name, 
    count: entry.institution_count 
  }));
  
  // For hardware fields, show all vendors regardless of count
  if (field === 'primary_office_hardware') {
    return systemData.sort((a, b) => b.count - a.count);
  }
  
  // For other fields, maintain the existing logic
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
    queryKey: ['system-analytics-datacube'],
    queryFn: async () => {
      // Fetch pre-computed analytics from the datacube
      const { data, error } = await supabase
        .from('system_analytics_datacube')
        .select('system_field, system_name, institution_count')
        .order('institution_count', { ascending: false });

      if (error) throw error;

      const analytics: SystemAnalytics = {
        studentInformationSystems: processDatacubeData(data || [], 'student_information_system'),
        financialSystems: processDatacubeData(data || [], 'financial_system'),
        learningManagementSystems: processDatacubeData(data || [], 'learning_management'),
        financialAidSystems: processDatacubeData(data || [], 'financial_aid'),
        hcmSystems: processDatacubeData(data || [], 'hcm_hr'),
        payrollSystems: processDatacubeData(data || [], 'payroll_system'),
        housingManagementSystems: processDatacubeData(data || [], 'housing_management'),
        admissionsCrms: processDatacubeData(data || [], 'admissions_crm'),
        alumniAdvancementCrms: processDatacubeData(data || [], 'alumni_advancement_crm'),
        primaryOfficeHardware: processDatacubeData(data || [], 'primary_office_hardware'),
      };

      return analytics;
    },
    staleTime: 1000 * 60 * 30, // Consider data stale after 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });
};