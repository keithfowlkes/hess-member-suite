import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  invitation_token: string;
  invited_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  organization?: {
    name: string;
  };
}

export const useOrganizationInvitations = () => {
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organizations!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invitations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (organizationId: string, email: string) => {
    try {
      // Get current user for invited_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate token and set expiry (7 days)
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: organizationId,
          email,
          invitation_token: token,
          invited_by: user.id,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      // Get organization name for email
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      // Send invitation email
      await supabase.functions.invoke('organization-emails', {
        body: {
          type: 'invitation',
          to: email,
          organizationName: org?.name || 'Unknown Organization',
          token
        }
      });

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${email}`,
      });

      await fetchInvitations();
      return { success: true };
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const { data: invitation, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organizations!inner(name)
        `)
        .eq('id', invitationId)
        .single();

      if (error) throw error;

      // Update expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabase
        .from('organization_invitations')
        .update({ expires_at: expiresAt.toISOString() })
        .eq('id', invitationId);

      // Resend email
      await supabase.functions.invoke('organization-emails', {
        body: {
          type: 'invitation',
          to: invitation.email,
          organizationName: invitation.organizations.name,
          token: invitation.invitation_token
        }
      });

      toast({
        title: "Invitation Resent",
        description: `Invitation resent to ${invitation.email}`,
      });

      await fetchInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive"
      });
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Invitation Deleted",
        description: "Invitation has been deleted",
      });

      await fetchInvitations();
    } catch (error: any) {
      console.error('Error deleting invitation:', error);
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  return {
    invitations,
    loading,
    createInvitation,
    resendInvitation,
    deleteInvitation,
    refetch: fetchInvitations
  };
};