import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationTotals } from '@/hooks/useOrganizationTotals';

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
  const { data: totals, isLoading: totalsLoading } = useOrganizationTotals();

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
      
      // Get organization statistics for revenue calculation
      // Use the same query as datacube to ensure consistency
      const { data: orgStats, error: orgError } = await supabase
        .from('organizations')
        .select('membership_status, annual_fee_amount')
        .eq('membership_status', 'active')
        .or('organization_type.eq.member,organization_type.is.null');

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
      const pendingInvoices = invoiceStats?.length || 0;
      
      const totalRevenue = orgStats?.reduce((sum, org) => {
        return sum + (org.annual_fee_amount || 0);
      }, 0) || 0;

      const calculatedStats = {
        totalOrganizations: totals?.totalOrganizations || 0, // From datacube
        activeOrganizations: totals?.totalOrganizations || 0, // From datacube - same as total
        pendingInvoices,
        totalRevenue,
        totalStudentFte: totals?.totalStudentFte || 0 // From datacube
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
    if (!totalsLoading) {
      fetchStats();
    }
  }, [totalsLoading, totals]);

  return {
    stats,
    loading: loading || totalsLoading,
    refetch: fetchStats
  };
}