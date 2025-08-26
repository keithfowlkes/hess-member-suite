import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InvoiceTemplate {
  id: string;
  name: string;
  logo_url?: string;
  header_content: string;
  footer_content: string;
  custom_styles: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useInvoiceTemplates() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching templates',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (id: string, updates: Partial<InvoiceTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('invoice_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Template updated successfully'
      });
      
      await fetchTemplates();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error updating template',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const uploadLogo = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('invoice-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('invoice-logos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Error uploading logo',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const getDefaultTemplate = () => {
    return templates.find(t => t.is_default) || templates[0];
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    fetchTemplates,
    updateTemplate,
    uploadLogo,
    getDefaultTemplate
  };
}