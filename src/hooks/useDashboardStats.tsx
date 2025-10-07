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

  // Set up real-time subscription for organizations
  useEffect(() => {
    const channelName = `dashboard_stats_${Math.random().toString(36).substr(2, 9)}`;
    const subscription = supabase
      .channel(channelName)
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
      
      // Get organization statistics - only active members
      const { data: orgStats, error: orgError } = await supabase
        .from('organizations')
        .select('membership_status, annual_fee_amount, student_fte')
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
      const totalOrganizations = orgStats?.length || 0;
      const activeOrganizations = orgStats?.filter(org => org.membership_status === 'active').length || 0;
      const pendingInvoices = invoiceStats?.length || 0;
      
      const totalRevenue = orgStats?.reduce((sum, org) => {
        if (org.membership_status === 'active') {
          return sum + (org.annual_fee_amount || 0);
        }
        return sum;
      }, 0) || 0;

      const totalStudentFte = orgStats?.reduce((sum, org) => {
        if (org.membership_status === 'active') {
          return sum + (org.student_fte || 0);
        }
        return sum;
      }, 0) || 0;

      const calculatedStats = {
        totalOrganizations,
        activeOrganizations,
        pendingInvoices,
        totalRevenue,
        totalStudentFte
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