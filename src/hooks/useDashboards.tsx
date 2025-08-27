import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DashboardComponent {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  config: {
    chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
    dataSource?: string;
    filters?: any[];
    columns?: string[];
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    content?: string;
    metric?: {
      value: number | string;
      label: string;
      change?: number;
      changeType?: 'positive' | 'negative' | 'neutral';
    };
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  layout: {
    components: DashboardComponent[];
  };
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useDashboards = () => {
  return useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        layout: (item.layout as unknown) as { components: DashboardComponent[] }
      })) as Dashboard[];
    },
  });
};

export const useDashboard = (id: string) => {
  return useQuery({
    queryKey: ['dashboard', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        layout: (data.layout as unknown) as { components: DashboardComponent[] }
      } as Dashboard;
    },
    enabled: !!id,
  });
};

export const useCreateDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dashboardData: {
      title: string;
      description?: string;
      layout?: any;
      is_public?: boolean;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('dashboards')
        .insert({
          ...dashboardData,
          layout: dashboardData.layout as any,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast({
        title: "Success",
        description: "Dashboard created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create dashboard",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updateData 
    }: Partial<Dashboard> & { id: string }) => {
      const { data, error } = await supabase
        .from('dashboards')
        .update({
          ...updateData,
          layout: updateData.layout as any
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', data.id] });
      toast({
        title: "Success",
        description: "Dashboard updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update dashboard",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast({
        title: "Success",
        description: "Dashboard deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete dashboard",
        variant: "destructive"
      });
    }
  });
};

// Hook for fetching data for dashboard components - simplified version
export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      // For now, return mock data to avoid TypeScript issues
      return {
        organizations: [],
        invoices: [],
        profiles: []
      };
    },
  });
};