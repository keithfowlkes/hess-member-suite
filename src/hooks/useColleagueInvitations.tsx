import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ColleagueInvitation {
  id: string;
  organization_id: string;
  email: string;
  invited_first_name: string | null;
  invited_last_name: string | null;
  status: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  can_edit_organization: boolean | null;
}

export function useColleagueInvitations(organizationId?: string, enabled = true) {
  const [invitations, setInvitations] = useState<ColleagueInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchInvitations = useCallback(async () => {
    if (!organizationId || !enabled) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('id, organization_id, email, invited_first_name, invited_last_name, status, expires_at, used_at, revoked_at, created_at, can_edit_organization')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvitations((data as ColleagueInvitation[]) || []);
    } catch (error) {
      console.error('Error loading colleague invitations:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, enabled]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const callFunction = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('invite-organization-user', { body: payload });
    if (error) {
      let details = error.message;
      try {
        const ctx = (error as any)?.context;
        if (ctx?.text) details = await ctx.text();
      } catch {
        /* ignore */
      }
      try {
        const parsed = JSON.parse(details);
        details = parsed?.error || details;
      } catch {
        /* ignore */
      }
      throw new Error(details || 'Request failed');
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const sendInvitation = async (input: { firstName: string; lastName: string; email: string; canEditOrganization?: boolean }) => {
    if (!organizationId) return { success: false };
    setSubmitting(true);
    try {
      const result: any = await callFunction({ action: 'create', organizationId, ...input });
      toast({
        title: 'Invitation sent',
        description: result?.emailSent === false
          ? `Invitation created for ${input.email}, but the email could not be delivered.`
          : `An invitation email was sent to ${input.email}.`,
      });
      await fetchInvitations();
      return { success: true };
    } catch (error: any) {
      toast({ title: 'Could not send invitation', description: error.message, variant: 'destructive' });
      return { success: false, error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    if (!organizationId) return;
    try {
      await callFunction({ action: 'resend', organizationId, invitationId });
      toast({ title: 'Invitation resent', description: 'A new invitation email is on the way.' });
      await fetchInvitations();
    } catch (error: any) {
      toast({ title: 'Could not resend invitation', description: error.message, variant: 'destructive' });
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!organizationId) return;
    try {
      await callFunction({ action: 'revoke', organizationId, invitationId });
      toast({ title: 'Invitation revoked', description: 'The invitation link is no longer valid.' });
      await fetchInvitations();
    } catch (error: any) {
      toast({ title: 'Could not revoke invitation', description: error.message, variant: 'destructive' });
    }
  };

  const setInvitationPermission = async (invitationId: string, canEditOrganization: boolean) => {
    if (!organizationId) return { success: false };
    setSubmitting(true);
    try {
      await callFunction({ action: 'set_permission', organizationId, invitationId, canEditOrganization });
      toast({
        title: 'Profile access updated',
        description: canEditOrganization
          ? 'This colleague can now submit institution profile updates.'
          : 'This colleague is now view only for the institution profile.',
      });
      await fetchInvitations();
      return { success: true };
    } catch (error: any) {
      toast({ title: 'Could not update access', description: error.message, variant: 'destructive' });
      return { success: false, error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    if (!organizationId) return { success: false };
    setSubmitting(true);
    try {
      const result: any = await callFunction({ action: 'delete', organizationId, invitationId });
      toast({
        title: 'Access removed',
        description: result?.accountRemoved
          ? 'The colleague’s portal account and access have been removed.'
          : 'The invitation has been removed from your access list.',
      });
      await fetchInvitations();
      return { success: true };
    } catch (error: any) {
      toast({ title: 'Could not remove access', description: error.message, variant: 'destructive' });
      return { success: false, error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  return { invitations, loading, submitting, sendInvitation, resendInvitation, revokeInvitation, deleteInvitation, refetch: fetchInvitations };
}
