import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { organizationId, adminUserId } = await req.json();
    
    if (!organizationId || !adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing organizationId or adminUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting organization deletion: ${organizationId} by admin: ${adminUserId}`);

    // Get organization details for logging
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, contact_person_id, profiles:contact_person_id(user_id, first_name, last_name, email)')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error('Error fetching organization:', orgError);
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found organization: ${organization.name}`);

    const deletedItems = [];
    let userId = null;

    // Get user ID from profile if it exists
    if (organization.profiles && organization.profiles.user_id) {
      userId = organization.profiles.user_id;
      console.log(`Found associated user: ${userId}`);
    }

    // 1. Delete invoices associated with the organization
    const { data: deletedInvoices, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    if (invoiceError) {
      console.error('Error deleting invoices:', invoiceError);
    } else {
      deletedItems.push(`${deletedInvoices?.length || 0} invoices`);
      console.log(`Deleted ${deletedInvoices?.length || 0} invoices`);
    }

    // 2. Delete organization invitations
    const { data: deletedInvitations, error: invitationError } = await supabaseAdmin
      .from('organization_invitations')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    if (invitationError) {
      console.error('Error deleting invitations:', invitationError);
    } else {
      deletedItems.push(`${deletedInvitations?.length || 0} invitations`);
      console.log(`Deleted ${deletedInvitations?.length || 0} invitations`);
    }

    // 3. Delete transfer requests
    const { data: deletedTransfers, error: transferError } = await supabaseAdmin
      .from('organization_transfer_requests')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    if (transferError) {
      console.error('Error deleting transfer requests:', transferError);
    } else {
      deletedItems.push(`${deletedTransfers?.length || 0} transfer requests`);
      console.log(`Deleted ${deletedTransfers?.length || 0} transfer requests`);
    }

    // 4. Delete reassignment requests
    const { data: deletedReassignments, error: reassignmentError } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    if (reassignmentError) {
      console.error('Error deleting reassignment requests:', reassignmentError);
    } else {
      deletedItems.push(`${deletedReassignments?.length || 0} reassignment requests`);
      console.log(`Deleted ${deletedReassignments?.length || 0} reassignment requests`);
    }

    // 5. Delete the organization (this will cascade to profiles via the foreign key)
    const { error: deleteOrgError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (deleteOrgError) {
      console.error('Error deleting organization:', deleteOrgError);
      return new Response(
        JSON.stringify({ error: `Failed to delete organization: ${deleteOrgError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    deletedItems.push('organization record');
    console.log('Deleted organization record');

    // 6. Delete user roles and auth user if user exists
    if (userId) {
      // Delete user roles first
      const { data: deletedRoles, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .select('id');

      if (roleError) {
        console.error('Error deleting user roles:', roleError);
      } else {
        deletedItems.push(`${deletedRoles?.length || 0} user roles`);
        console.log(`Deleted ${deletedRoles?.length || 0} user roles`);
      }

      // Delete auth user first (this should cascade delete the profile via foreign key)
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        if (authError.message?.includes('User not found') || authError.code === 'user_not_found') {
          console.log('User not found in auth (already deleted)');
        } else {
          console.error('Error deleting auth user:', authError);
          
          // If auth deletion fails, try to delete profile manually
          console.log('Attempting manual profile deletion...');
          const { data: deletedProfiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('user_id', userId)
            .select('id');

          if (profileError) {
            console.error('Error deleting profile manually:', profileError);
          } else {
            deletedItems.push(`${deletedProfiles?.length || 0} profiles (manual)`);
            console.log(`Manually deleted ${deletedProfiles?.length || 0} profiles`);
          }
        }
      } else {
        deletedItems.push('auth user');
        console.log('Deleted auth user (profile should cascade delete)');
      }
    }

    // Log the deletion for audit purposes
    await supabaseAdmin.from('audit_log').insert({
      action: 'organization_deleted',
      entity_type: 'organization',
      entity_id: organizationId,
      user_id: adminUserId,
      details: {
        organizationName: organization.name,
        contactEmail: organization.profiles?.email,
        deletedItems: deletedItems,
        deletedBy: adminUserId
      }
    });

    console.log(`Successfully deleted organization ${organization.name} and all associated data`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${organization.name} and all associated data`,
        deletedItems: deletedItems
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});