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

    console.log(`Starting organization unapproval: ${organizationId} by admin: ${adminUserId}`);

    // Get organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
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

    // Get profile - try by contact_person_id first, then by organization name
    let profile;
    if (organization.contact_person_id) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', organization.contact_person_id)
        .single();
      profile = profileData;
    }

    // If no profile found via contact_person_id, try by organization name
    if (!profile) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('organization', organization.name)
        .single();
      profile = profileData;
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'No profile found for this organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = profile.user_id;

    // Create pending registration record
    const { data: pendingReg, error: pendingError } = await supabaseAdmin
      .from('pending_registrations')
      .insert({
        email: profile.email,
        password_hash: `unapproved_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        first_name: profile.first_name,
        last_name: profile.last_name,
        organization_name: organization.name,
        state_association: profile.state_association,
        student_fte: organization.student_fte,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zip: profile.zip,
        primary_contact_title: profile.primary_contact_title,
        secondary_first_name: profile.secondary_first_name,
        secondary_last_name: profile.secondary_last_name,
        secondary_contact_title: profile.secondary_contact_title,
        secondary_contact_email: profile.secondary_contact_email,
        student_information_system: profile.student_information_system,
        financial_system: profile.financial_system,
        financial_aid: profile.financial_aid,
        hcm_hr: profile.hcm_hr,
        payroll_system: profile.payroll_system,
        purchasing_system: profile.purchasing_system,
        housing_management: profile.housing_management,
        learning_management: profile.learning_management,
        admissions_crm: profile.admissions_crm,
        alumni_advancement_crm: profile.alumni_advancement_crm,
        primary_office_apple: profile.primary_office_apple,
        primary_office_asus: profile.primary_office_asus,
        primary_office_dell: profile.primary_office_dell,
        primary_office_hp: profile.primary_office_hp,
        primary_office_microsoft: profile.primary_office_microsoft,
        primary_office_other: profile.primary_office_other,
        primary_office_other_details: profile.primary_office_other_details,
        other_software_comments: profile.other_software_comments,
        is_private_nonprofit: profile.is_private_nonprofit,
        approval_status: 'pending'
      })
      .select()
      .single();

    if (pendingError) {
      console.error('Error creating pending registration:', pendingError);
      return new Response(
        JSON.stringify({ error: `Failed to create pending registration: ${pendingError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created pending registration:', pendingReg.id);

    const deletedItems = [];

    // Delete invoices associated with the organization
    const { data: deletedInvoices } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    deletedItems.push(`${deletedInvoices?.length || 0} invoices`);

    // Delete organization invitations
    const { data: deletedInvitations } = await supabaseAdmin
      .from('organization_invitations')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    deletedItems.push(`${deletedInvitations?.length || 0} invitations`);

    // Delete transfer requests
    const { data: deletedTransfers } = await supabaseAdmin
      .from('organization_transfer_requests')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    deletedItems.push(`${deletedTransfers?.length || 0} transfer requests`);

    // Delete reassignment requests
    const { data: deletedReassignments } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .delete()
      .eq('organization_id', organizationId)
      .select('id');

    deletedItems.push(`${deletedReassignments?.length || 0} reassignment requests`);

    // Delete user roles
    const { data: deletedRoles } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .select('id');

    deletedItems.push(`${deletedRoles?.length || 0} user roles`);

    // Delete the organization (this should cascade delete the profile)
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

    // Delete profile if it still exists
    const { data: deletedProfiles } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId)
      .select('id');

    deletedItems.push(`${deletedProfiles?.length || 0} profiles`);

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      if (!authError.message?.includes('User not found')) {
        console.error('Error deleting auth user:', authError);
      }
    } else {
      deletedItems.push('auth user');
    }

    // Log the unapproval action
    await supabaseAdmin.from('audit_log').insert({
      action: 'organization_unapproved',
      entity_type: 'organization',
      entity_id: organizationId,
      user_id: adminUserId,
      details: {
        organizationName: organization.name,
        contactEmail: profile.email,
        pendingRegistrationId: pendingReg.id,
        deletedItems: deletedItems,
        unapprovedBy: adminUserId
      }
    });

    console.log(`Successfully unapproved organization ${organization.name} and restored to pending queue`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully unapproved ${organization.name} and restored to pending approval queue`,
        pendingRegistrationId: pendingReg.id,
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