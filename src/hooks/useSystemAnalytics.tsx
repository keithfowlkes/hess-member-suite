import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

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
  purchasingSystems: SystemUsage[];
  housingManagementSystems: SystemUsage[];
  admissionsCrms: SystemUsage[];
  alumniAdvancementCrms: SystemUsage[];
  paymentPlatforms: SystemUsage[];
  mealPlanManagement: SystemUsage[];
  identityManagement: SystemUsage[];
  doorAccess: SystemUsage[];
  documentManagement: SystemUsage[];
  voipSystems: SystemUsage[];
  networkInfrastructure: SystemUsage[];
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
  
  // Fields that should show all systems without grouping into "Other"
  const showAllSystemsFields = [
    'student_information_system',
    'financial_system',
    'hcm_hr',
    'primary_office_hardware',
    'payment_platform',
    'meal_plan_management',
    'identity_management',
    'door_access',
    'document_management',
    'voip',
    'network_infrastructure'
  ];
  
  // For specified fields, show all systems regardless of count
  if (showAllSystemsFields.includes(field)) {
    return systemData.sort((a, b) => b.count - a.count);
  }
  
  // For other fields, maintain the existing logic
  // Separate items with count >= 10 and < 10, treating "Other" as a small item
  const mainItems = systemData.filter(item => item.count >= 10 && item.name !== 'Other');
  const smallItems = systemData.filter(item => item.count < 10 || item.name === 'Other');
  
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
  const queryClient = useQueryClient();

  // Debounced real-time subscription to prevent cascading refetches
  useEffect(() => {
    let invalidateTimeout: NodeJS.Timeout;
    
    const channelName = `system_analytics_${Math.random().toString(36).substr(2, 9)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'system_analytics_datacube' 
        }, 
        () => {
          console.log('Analytics datacube changed (debounced)');
          clearTimeout(invalidateTimeout);
          invalidateTimeout = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['system-analytics-datacube'] });
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(invalidateTimeout);
      subscription.unsubscribe();
    };
  }, [queryClient]);

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
        purchasingSystems: processDatacubeData(data || [], 'purchasing_system'),
        housingManagementSystems: processDatacubeData(data || [], 'housing_management'),
        admissionsCrms: processDatacubeData(data || [], 'admissions_crm'),
        alumniAdvancementCrms: processDatacubeData(data || [], 'alumni_advancement_crm'),
        paymentPlatforms: processDatacubeData(data || [], 'payment_platform'),
        mealPlanManagement: processDatacubeData(data || [], 'meal_plan_management'),
        identityManagement: processDatacubeData(data || [], 'identity_management'),
        doorAccess: processDatacubeData(data || [], 'door_access'),
        documentManagement: processDatacubeData(data || [], 'document_management'),
        voipSystems: processDatacubeData(data || [], 'voip'),
        networkInfrastructure: processDatacubeData(data || [], 'network_infrastructure'),
        primaryOfficeHardware: processDatacubeData(data || [], 'primary_office_hardware'),
      };

      return analytics;
    },
    staleTime: 1000 * 60 * 30, // Consider data stale after 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};