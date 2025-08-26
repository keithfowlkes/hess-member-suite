import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  amount: number;
  prorated_amount?: number;
  invoice_date: string;
  due_date: string;
  period_start_date: string;
  period_end_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  sent_date?: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  organizations?: {
    id: string;
    name: string;
    email?: string;
    membership_status: string;
  };
}

export interface CreateInvoiceData {
  organization_id: string;
  amount: number;
  prorated_amount?: number;
  due_date: string;
  period_start_date: string;
  period_end_date: string;
  notes?: string;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  const fetchInvoices = async () => {
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          organizations (
            id,
            name,
            email,
            membership_status
          )
        `);

      // If not admin, only show invoices for user's organization
      if (!isAdmin) {
        const { data: userOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('contact_person_id', user?.id)
          .single();

        if (userOrg) {
          query = query.eq('organization_id', userOrg.id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching invoices',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async (invoiceData: CreateInvoiceData) => {
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          invoice_number: invoiceNumber,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Invoice created successfully'
      });
      
      await fetchInvoices();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error creating invoice',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateInvoice = async (id: string, invoiceData: Partial<Invoice>) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Invoice updated successfully'
      });
      
      await fetchInvoices();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error updating invoice',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Invoice marked as paid'
      });
      
      await fetchInvoices();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error updating invoice',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const sendInvoice = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Invoice sent successfully'
      });
      
      await fetchInvoices();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error sending invoice',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user, isAdmin]);

  return {
    invoices,
    loading,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    markAsPaid,
    sendInvoice
  };
}