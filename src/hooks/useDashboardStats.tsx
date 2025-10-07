import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  pendingInvoices: number;
  totalRevenue: number;
  totalStudentFte: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
    totalStudentFte: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Set up real-time subscription for organizations and datacube
  useEffect(() => {
    const channelName = `dashboard_stats_${Math.random().toString(36).substr(2, 9)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'system_analytics_datacube' 
        }, 
        () => {
          console.log('Analytics datacube changed, refetching dashboard stats...');
          fetchStats();
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'organizations' 
        }, 
        () => {
          console.log('Organizations changed, refetching dashboard stats...');
          fetchStats();
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'invoices' 
        }, 
        () => {
          console.log('Invoices changed, refetching dashboard stats...');
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchStats = async () => {
    try {
      console.log('Fetching dashboard stats...');
      
      // Get organization totals from the datacube (single source of truth)
      const { data: datacubeData, error: datacubeError } = await supabase
        .from('system_analytics_datacube')
        .select('system_name, institution_count')
        .eq('system_field', 'organization_totals');

      if (datacubeError) {
        console.error('Datacube error:', datacubeError);
        throw datacubeError;
      }

      const totalsMap = datacubeData.reduce((acc, item) => {
        acc[item.system_name] = item.institution_count;
        return acc;
      }, {} as Record<string, number>);

      const totalOrganizations = totalsMap['total_organizations'] || 0;
      const totalStudentFte = totalsMap['total_student_fte'] || 0;

      console.log('Organization totals from datacube:', { totalOrganizations, totalStudentFte });

      // Get organization statistics for revenue calculation
      const { data: orgStats, error: orgError } = await supabase
        .from('organizations')
        .select('membership_status, annual_fee_amount')
        .eq('organization_type', 'member')
        .eq('membership_status', 'active');

      if (orgError) {
        console.error('Organization stats error:', orgError);
        throw orgError;
      }
      
      console.log('Organization stats fetched:', orgStats?.length || 0, 'records');

      // Get invoice statistics
      const { data: invoiceStats, error: invoiceError } = await supabase
        .from('invoices')
        .select('status')
        .in('status', ['draft', 'sent']);

      if (invoiceError) {
        console.error('Invoice stats error:', invoiceError);
        throw invoiceError;
      }
      
      console.log('Invoice stats fetched:', invoiceStats?.length || 0, 'records');

      // Calculate statistics
      const activeOrganizations = orgStats?.length || 0;
      const pendingInvoices = invoiceStats?.length || 0;
      
      const totalRevenue = orgStats?.reduce((sum, org) => {
        return sum + (org.annual_fee_amount || 0);
      }, 0) || 0;

      const calculatedStats = {
        totalOrganizations, // From datacube
        activeOrganizations,
        pendingInvoices,
        totalRevenue,
        totalStudentFte // From datacube
      };
      
      console.log('Calculated stats:', calculatedStats);
      setStats(calculatedStats);

    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: 'Error loading dashboard statistics',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      console.log('Dashboard stats loading complete');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
}