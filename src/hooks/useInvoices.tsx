import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { renderInvoiceEmailHTML } from '@/utils/invoiceEmailRenderer';

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
      // First get the invoice and organization details
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, organizations ( id, name, email )')
        .eq('id', id)
        .single();
      
      if (invoiceError || !invoice) throw new Error('Invoice not found');
      if (!(invoice as any).organizations?.email) throw new Error('Organization email not found');

      // Use the centralized email delivery system
      const invoiceEmailData = {
        organization_name: (invoice as any).organizations.name,
        invoice_number: (invoice as any).invoice_number,
        amount: `$${((invoice as any).prorated_amount || (invoice as any).amount).toLocaleString()}`,
        due_date: (invoice as any).due_date,
        period_start_date: (invoice as any).period_start_date,
        period_end_date: (invoice as any).period_end_date,
        notes: (invoice as any).notes || ''
      };

      const invoiceHTML = renderInvoiceEmailHTML(invoiceEmailData);
      const subject = `HESS Consortium - Invoice ${(invoice as any).invoice_number}`;

      const { error: emailError } = await supabase.functions.invoke('centralized-email-delivery-public', {
        body: {
          type: 'invoice',
          to: (invoice as any).organizations.email,
          subject,
          data: {
            ...invoiceEmailData,
            invoice_content: invoiceHTML
          }
        }
      });

      if (emailError) throw emailError;

      // Update invoice status only after successful email send
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
        description: `Invoice emailed to ${(invoice as any).organizations.name} via centralized delivery.`
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

  const createBulkInvoices = async (invoiceData: Omit<CreateInvoiceData, 'organization_id'>) => {
    try {
      // Get all active organizations
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, membership_start_date')
        .eq('membership_status', 'active');

      if (orgError) throw orgError;

      if (!organizations || organizations.length === 0) {
        throw new Error('No active organizations found');
      }

      const invoicesToCreate = organizations.map(org => {
        const invoiceNumber = `INV-${Date.now()}-${org.id.slice(-6)}`;
        
        // Calculate prorated amount if membership started after period start
        let proratedAmount = undefined;
        if (org.membership_start_date) {
          const membershipStart = new Date(org.membership_start_date);
          const periodStart = new Date(invoiceData.period_start_date);
          const periodEnd = new Date(invoiceData.period_end_date);
          
          if (membershipStart > periodStart) {
            const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
            const remainingDays = Math.ceil((periodEnd.getTime() - membershipStart.getTime()) / (1000 * 60 * 60 * 24));
            proratedAmount = Math.round((invoiceData.amount * remainingDays / totalDays) * 100) / 100;
          }
        }

        return {
          ...invoiceData,
          organization_id: org.id,
          invoice_number: invoiceNumber,
          prorated_amount: proratedAmount,
          status: 'draft' as const
        };
      });

      const { data, error } = await supabase
        .from('invoices')
        .insert(invoicesToCreate)
        .select();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `${data?.length || 0} invoices created successfully for all active organizations`
      });
      
      await fetchInvoices();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error creating bulk invoices',
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

  const markAllInvoicesAsPaid = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString()
        })
        .neq('status', 'paid')
        .select();

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `${data?.length || 0} invoices marked as paid`
      });
      
      await fetchInvoices();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error updating invoices',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully'
      });
      
      await fetchInvoices();
    } catch (error: any) {
      toast({
        title: 'Error deleting invoice',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    invoices,
    loading,
    fetchInvoices,
    createInvoice,
    createBulkInvoices,
    updateInvoice,
    markAsPaid,
    sendInvoice,
    deleteInvoice,
    markAllInvoicesAsPaid
  };
}