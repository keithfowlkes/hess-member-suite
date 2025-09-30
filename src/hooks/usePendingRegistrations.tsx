import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PendingRegistration {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  state_association: string | null;
  student_fte: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  primary_contact_title: string | null;
  secondary_first_name: string | null;
  secondary_last_name: string | null;
  secondary_contact_title: string | null;
  secondary_contact_email: string | null;
  student_information_system: string | null;
  financial_system: string | null;
  financial_aid: string | null;
  hcm_hr: string | null;
  payroll_system: string | null;
  purchasing_system: string | null;
  housing_management: string | null;
  learning_management: string | null;
  admissions_crm: string | null;
  alumni_advancement_crm: string | null;
  primary_office_apple: boolean;
  primary_office_asus: boolean;
  primary_office_dell: boolean;
  primary_office_hp: boolean;
  primary_office_microsoft: boolean;
  primary_office_other: boolean;
  primary_office_other_details: string | null;
  other_software_comments: string | null;
  is_private_nonprofit: boolean;
  voip: string | null;
  network_infrastructure: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  rejection_reason?: string | null;
  // New fields
  priority_level?: 'low' | 'normal' | 'high' | 'urgent';
  admin_notes?: string | null;
  duplicate_check_status?: 'pending' | 'clean' | 'flagged';
  flags?: string[] | null;
  resubmission_count?: number;
}

export function usePendingRegistrations() {
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingRegistrations = async () => {
    try {
      console.log('🔍 PENDING DEBUG: Fetching pending registrations...');
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ PENDING DEBUG: Error fetching pending registrations:', error);
        toast({
          title: "Error",
          description: "Failed to fetch pending registrations",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ PENDING DEBUG: Successfully fetched pending registrations:', {
        count: data?.length || 0,
        registrations: data?.map(r => ({ id: r.id, email: r.email, organization: r.organization_name, created_at: r.created_at, status: r.approval_status }))
      });

      // Clean up any non-pending records that might block new registrations
      const nonPendingRecords = (data || []).filter(r => r.approval_status !== 'pending');
      if (nonPendingRecords.length > 0) {
        console.log('🧹 PENDING DEBUG: Found non-pending records in pending table, cleaning up:', nonPendingRecords.map(r => ({ id: r.id, email: r.email, status: r.approval_status })));
        try {
          const { error: cleanupError } = await supabase
            .from('pending_registrations')
            .delete()
            .neq('approval_status', 'pending');
          
          if (cleanupError) {
            console.warn('⚠️ PENDING DEBUG: Failed to cleanup non-pending records:', cleanupError);
          } else {
            console.log('✅ PENDING DEBUG: Successfully cleaned up non-pending records');
          }
        } catch (cleanupErr) {
          console.warn('⚠️ PENDING DEBUG: Error during cleanup:', cleanupErr);
        }
      }

      // Filter out and delete pending registrations for organizations that already exist
      const original = (data || []) as PendingRegistration[];
      let registrations = [...original];
      try {
        const orgNames = Array.from(new Set(original.map(r => r.organization_name).filter(Boolean))) as string[];
        if (orgNames.length > 0) {
          const { data: existingOrgs, error: orgsErr } = await supabase
            .from('organizations')
            .select('name');
          if (orgsErr) {
            console.warn('⚠️ PENDING DEBUG: Could not check existing organizations:', orgsErr);
          } else {
            const normalize = (s?: string | null) => (s ?? '')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .trim();
            const existingSet = new Set((existingOrgs || []).map((o: any) => normalize(o.name)));

            const duplicatesToDelete = original.filter(r => existingSet.has(normalize(r.organization_name)));
            if (duplicatesToDelete.length > 0) {
              console.log('🧹 PENDING DEBUG: Deleting duplicates present in organizations:', { ids: duplicatesToDelete.map(d => d.id), count: duplicatesToDelete.length });
              const { error: delErr } = await supabase
                .from('pending_registrations')
                .delete()
                .in('id', duplicatesToDelete.map(d => d.id))
                .eq('approval_status', 'pending');
              if (delErr) {
                console.warn('⚠️ PENDING DEBUG: Failed to delete duplicates:', delErr);
              } else {
                console.log('✅ PENDING DEBUG: Deleted duplicate pending registrations successfully');
              }
            }

            // Targeted cleanup for known duplicate: J.K. Fowlkes University
            const targetName = 'J.K. Fowlkes University';
            const targetNormalized = normalize(targetName);
            const jkDuplicates = original.filter(r => normalize(r.organization_name) === targetNormalized);
            if (jkDuplicates.length > 0) {
              console.log('🧹 PENDING DEBUG: Force-deleting known duplicate registrations for J.K. Fowlkes University', { ids: jkDuplicates.map(d => d.id) });
              const { error: jkDelErr } = await supabase
                .from('pending_registrations')
                .delete()
                .in('id', jkDuplicates.map(d => d.id));
              if (jkDelErr) {
                console.warn('⚠️ PENDING DEBUG: Failed to force-delete J.K. Fowlkes University duplicates:', jkDelErr);
              } else {
                console.log('✅ PENDING DEBUG: Force-deleted J.K. Fowlkes University duplicates');
              }
            }

            const before = registrations.length;
            registrations = registrations.filter(r => !existingSet.has(normalize(r.organization_name)) && normalize(r.organization_name) !== targetNormalized);
            console.log('✅ PENDING DEBUG: Filtered duplicates present in organizations and targeted name:', { before, after: registrations.length });
          }
        }
      } catch (filterErr) {
        console.warn('⚠️ PENDING DEBUG: Error while filtering/deleting duplicates against organizations:', filterErr);
      }

      setPendingRegistrations(registrations);
    } catch (error) {
      console.error('❌ PENDING DEBUG: Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (registrationId: string, adminUserId?: string, selectedFeeTier?: number): Promise<boolean | { success: boolean; organizationId?: string }> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('approve-pending-registration', {
        body: {
          registrationId,
          adminUserId,
          selectedFeeTier
        }
      });

      if (error) {
        throw error;
      }

      // Check if the response includes organizationId
      if (data && data.organizationId) {
        toast({
          title: "Registration Approved",
          description: "The registration has been approved and user account created successfully.",
        });

      // Immediately remove the approved item from the local state for instant UI update
      setPendingRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
      
      // Clean up the approved record from pending_registrations table
      try {
        await supabase.functions.invoke('cleanup-pending-registration', {
          body: { email: pendingRegistrations.find(r => r.id === registrationId)?.email }
        });
      } catch (cleanupError) {
        console.warn('Failed to cleanup approved registration:', cleanupError);
      }
      
      // Also refresh the list to ensure consistency
      setTimeout(() => fetchPendingRegistrations(), 100);
      return { success: true, organizationId: data.organizationId };
      }

      toast({
        title: "Registration Approved",
        description: "The registration has been approved and user account created successfully.",
      });

      // Immediately remove the approved item from the local state for instant UI update
      setPendingRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
      
      // Also refresh the list to ensure consistency  
      setTimeout(() => fetchPendingRegistrations(), 100);
      return true;
    } catch (error: any) {
      console.error('Error approving registration:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve registration",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const rejectRegistration = async (
    registrationId: string, 
    reason: string,
    adminUserId?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Delete the rejected registration instead of just updating status
      const { error } = await supabase
        .from('pending_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) {
        throw error;
      }

      toast({
        title: "Registration Rejected",
        description: "The registration has been rejected and removed.",
      });

      // Immediately remove the rejected item from the local state for instant UI update
      setPendingRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
      
      // Also refresh the list to ensure consistency
      setTimeout(() => fetchPendingRegistrations(), 100);
      return true;
    } catch (error: any) {
      console.error('Error rejecting registration:', error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject registration",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🎬 PENDING DEBUG: Setting up pending registrations hook');
    fetchPendingRegistrations();

    // Subscribe to real-time updates
    console.log('📡 PENDING DEBUG: Setting up real-time subscription for pending_registrations');
    const subscription = supabase
      .channel('pending_registrations_channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'pending_registrations' }, 
        (payload) => {
          console.log('🔔 PENDING DEBUG: Real-time INSERT event received:', {
            eventType: 'INSERT',
            payload: payload.new,
            email: payload.new?.email,
            organization: payload.new?.organization_name
          });
          fetchPendingRegistrations();
          toast({
            title: "New Registration",
            description: "A new registration is pending approval.",
          });
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'pending_registrations' }, 
        (payload) => {
          console.log('🔔 PENDING DEBUG: Real-time UPDATE event received:', {
            eventType: 'UPDATE',
            old: payload.old,
            new: payload.new,
            email: payload.new?.email,
            organization: payload.new?.organization_name,
            status: payload.new?.approval_status
          });
          // Refresh the list to remove approved/rejected items from pending view
          fetchPendingRegistrations();
          
          // Show notification for status changes
          if (payload.new?.approval_status === 'approved') {
            toast({
              title: "Registration Approved",
              description: `${payload.new.organization_name} has been approved.`,
            });
          } else if (payload.new?.approval_status === 'rejected') {
            toast({
              title: "Registration Rejected", 
              description: `${payload.new.organization_name} has been rejected.`,
            });
          }
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'pending_registrations' }, 
        (payload) => {
          console.log('🔔 PENDING DEBUG: Real-time DELETE event received:', {
            eventType: 'DELETE',
            payload: payload.old
          });
          fetchPendingRegistrations();
        }
      )
      .subscribe((status) => {
        console.log('📡 PENDING DEBUG: Subscription status changed:', status);
      });

    return () => {
      console.log('🛑 PENDING DEBUG: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [toast]);

  const bulkApprove = async (registrationIds: string[], adminUserId?: string): Promise<void> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('bulk-registration-operations', {
        body: {
          operation: 'approve',
          registrationIds,
          adminUserId
        }
      });

      if (error) throw error;

      toast({
        title: "Bulk Approval Complete",
        description: `Successfully processed ${registrationIds.length} registration(s).`,
      });

      await fetchPendingRegistrations();
    } catch (error: any) {
      console.error('Error in bulk approve:', error);
      toast({
        title: "Bulk Approval Failed",
        description: error.message || "Failed to process bulk approval",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const bulkReject = async (registrationIds: string[], reason: string, adminUserId?: string): Promise<void> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('bulk-registration-operations', {
        body: {
          operation: 'reject',
          registrationIds,
          rejectionReason: reason,
          adminUserId
        }
      });

      if (error) throw error;

      toast({
        title: "Bulk Rejection Complete",
        description: `Successfully processed ${registrationIds.length} registration(s).`,
      });

      await fetchPendingRegistrations();
    } catch (error: any) {
      console.error('Error in bulk reject:', error);
      toast({
        title: "Bulk Rejection Failed", 
        description: error.message || "Failed to process bulk rejection",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdatePriority = async (registrationIds: string[], priority: string, adminUserId?: string): Promise<void> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('bulk-registration-operations', {
        body: {
          operation: 'priority_update',
          registrationIds,
          priority,
          adminUserId
        }
      });

      if (error) throw error;

      toast({
        title: "Priority Update Complete",
        description: `Successfully updated priority for ${registrationIds.length} registration(s).`,
      });

      await fetchPendingRegistrations();
    } catch (error: any) {
      console.error('Error in bulk priority update:', error);
      toast({
        title: "Priority Update Failed",
        description: error.message || "Failed to update priorities",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePriority = async (registrationId: string, priority: string, adminUserId?: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('pending_registrations')
        .update({
          priority_level: priority,
          admin_notes: `Priority updated to ${priority}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: "Priority Updated",
        description: `Registration priority updated to ${priority}.`,
      });

      await fetchPendingRegistrations();
      return true;
    } catch (error: any) {
      console.error('Error updating priority:', error);
      toast({
        title: "Priority Update Failed",
        description: error.message || "Failed to update priority",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    pendingRegistrations,
    loading,
    approveRegistration,
    rejectRegistration,
    bulkApprove,
    bulkReject,
    bulkUpdatePriority,
    updatePriority,
    refetch: fetchPendingRegistrations
  };
}