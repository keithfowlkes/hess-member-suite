import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      return data as SystemSetting[];
    },
  });
};

export const useSystemSetting = (settingKey: string) => {
  return useQuery({
    queryKey: ['system-setting', settingKey],
    queryFn: async () => {
      console.log('Fetching system setting:', settingKey);
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', settingKey)
        .maybeSingle();

      console.log('System setting result:', { data, error, settingKey });
      
      if (error) {
        console.error('System setting error:', error);
        throw error;
      }
      return data as SystemSetting | null;
    },
  });
};

export const useUpdateSystemSetting = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      settingKey, 
      settingValue, 
      description 
    }: { 
      settingKey: string; 
      settingValue: string; 
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: settingKey,
          setting_value: settingValue,
          description: description || null
        }, {
          onConflict: 'setting_key'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-setting', data.setting_key] });
      toast({
        title: "Success",
        description: "System setting updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update system setting",
        variant: "destructive"
      });
    }
  });
};