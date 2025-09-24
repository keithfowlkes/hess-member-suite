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
    console.log('=== UNAPPROVE ORGANIZATION FUNCTION START ===');
    
    // Initialize Supabase admin client
    console.log('Initializing Supabase admin client...');
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

    console.log('Parsing request body...');
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
    let pendingReg;

    console.log('Profile data:', JSON.stringify(profile, null, 2));
    console.log('Organization data:', JSON.stringify(organization, null, 2));

    // Create pending registration record
    try {
      // First, delete any existing pending registration with this email
      console.log(`Checking for existing pending registration with email: ${profile.email}`);
      const { error: deleteError } = await supabaseAdmin
        .from('pending_registrations')
        .delete()
        .eq('email', profile.email);

      if (deleteError) {
        console.error('Error deleting existing pending registration:', deleteError);
        // Continue anyway - this might not exist
      } else {
        console.log('Deleted any existing pending registration for this email');
      }

      const pendingData = {
        email: profile.email,
        password_hash: `unapproved_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        organization_name: organization.name,
        state_association: profile.state_association || '',
        student_fte: organization.student_fte || profile.student_fte || null,
        address: profile.address || organization.address_line_1 || '',
        city: profile.city || organization.city || '',
        state: profile.state || organization.state || '',
        zip: profile.zip || organization.zip_code || '',
        primary_contact_title: profile.primary_contact_title || organization.primary_contact_title || '',
        secondary_first_name: profile.secondary_first_name || organization.secondary_first_name || '',
        secondary_last_name: profile.secondary_last_name || organization.secondary_last_name || '',
        secondary_contact_title: profile.secondary_contact_title || organization.secondary_contact_title || '',
        secondary_contact_email: profile.secondary_contact_email || organization.secondary_contact_email || '',
        student_information_system: profile.student_information_system || organization.student_information_system || '',
        financial_system: profile.financial_system || organization.financial_system || '',
        financial_aid: profile.financial_aid || organization.financial_aid || '',
        hcm_hr: profile.hcm_hr || organization.hcm_hr || '',
        payroll_system: profile.payroll_system || organization.payroll_system || '',
        purchasing_system: profile.purchasing_system || organization.purchasing_system || '',
        housing_management: profile.housing_management || organization.housing_management || '',
        learning_management: profile.learning_management || organization.learning_management || '',
        admissions_crm: profile.admissions_crm || organization.admissions_crm || '',
        alumni_advancement_crm: profile.alumni_advancement_crm || organization.alumni_advancement_crm || '',
        primary_office_apple: profile.primary_office_apple ?? organization.primary_office_apple ?? false,
        primary_office_asus: profile.primary_office_asus ?? organization.primary_office_asus ?? false,
        primary_office_dell: profile.primary_office_dell ?? organization.primary_office_dell ?? false,
        primary_office_hp: profile.primary_office_hp ?? organization.primary_office_hp ?? false,
        primary_office_microsoft: profile.primary_office_microsoft ?? organization.primary_office_microsoft ?? false,
        primary_office_other: profile.primary_office_other ?? organization.primary_office_other ?? false,
        primary_office_other_details: profile.primary_office_other_details || organization.primary_office_other_details || '',
        other_software_comments: profile.other_software_comments || organization.other_software_comments || '',
        is_private_nonprofit: profile.is_private_nonprofit ?? false,
        approval_status: 'pending'
      };

      console.log('Creating new pending registration...');

      const { data: pendingRegData, error: pendingError } = await supabaseAdmin
        .from('pending_registrations')
        .insert(pendingData)
        .select()
        .single();

      if (pendingError) {
        console.error('Error creating pending registration:', pendingError);
        return new Response(
          JSON.stringify({ error: `Failed to create pending registration: ${pendingError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      pendingReg = pendingRegData;
      console.log('Created pending registration:', pendingReg.id);
    } catch (error) {
      console.error('Exception during pending registration creation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: `Exception creating pending registration: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting deletion process...');
    const deletedItems = [];

    // Delete invoices associated with the organization
    try {
      console.log('Deleting invoices...');
      const { data: deletedInvoices, error: invoicesError } = await supabaseAdmin
        .from('invoices')
        .delete()
        .eq('organization_id', organizationId)
        .select('id');

      if (invoicesError) {
        console.error('Error deleting invoices:', invoicesError);
        return new Response(
          JSON.stringify({ error: `Failed to delete invoices: ${invoicesError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      deletedItems.push(`${deletedInvoices?.length || 0} invoices`);
      console.log(`Deleted ${deletedInvoices?.length || 0} invoices`);
    } catch (error) {
      console.error('Exception deleting invoices:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: `Exception deleting invoices: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        pendingRegistrationId: pendingReg?.id,
        deletedItems: deletedItems,
        unapprovedBy: adminUserId
      }
    });

    console.log(`Successfully unapproved organization ${organization.name} and restored to pending queue`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully unapproved ${organization.name} and restored to pending approval queue`,
        pendingRegistrationId: pendingReg?.id,
        deletedItems: deletedItems
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN UNAPPROVE FUNCTION ===');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage,
        type: errorName 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});