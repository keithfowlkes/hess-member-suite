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

  const fetchStats = async () => {
    try {
      // Get organization statistics
      const { data: orgStats, error: orgError } = await supabase
        .from('organizations')
        .select('membership_status, annual_fee_amount, student_fte')
        .neq('name', 'Administrator');

      if (orgError) throw orgError;

      // Get invoice statistics
      const { data: invoiceStats, error: invoiceError } = await supabase
        .from('invoices')
        .select('status')
        .in('status', ['draft', 'sent']);

      if (invoiceError) throw invoiceError;

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

      setStats({
        totalOrganizations,
        activeOrganizations,
        pendingInvoices,
        totalRevenue,
        totalStudentFte
      });

    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: 'Error loading dashboard statistics',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
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