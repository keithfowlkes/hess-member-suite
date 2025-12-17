import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const { transfer_token } = await req.json();

    if (!transfer_token) {
      return new Response(JSON.stringify({ error: 'Transfer token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[complete-contact-transfer] Processing transfer with token`);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find the transfer request
    const { data: transferRequest, error: findError } = await adminClient
      .from('organization_transfer_requests')
      .select('*')
      .eq('transfer_token', transfer_token)
      .eq('status', 'pending')
      .single();

    if (findError || !transferRequest) {
      console.error('[complete-contact-transfer] Transfer not found:', findError);
      return new Response(JSON.stringify({ error: 'Transfer request not found or already processed' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if expired
    if (new Date(transferRequest.expires_at) < new Date()) {
      await adminClient
        .from('organization_transfer_requests')
        .update({ status: 'expired' })
        .eq('id', transferRequest.id);

      return new Response(JSON.stringify({ error: 'Transfer request has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get organization details
    const { data: organization, error: orgError } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', transferRequest.organization_id)
      .single();

    if (orgError || !organization) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if new contact already has a profile
    let newContactProfile = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', transferRequest.new_contact_email.toLowerCase())
      .maybeSingle();

    let newProfileId = newContactProfile.data?.id;

    // If no profile exists, we need to create one (user will need to register/accept)
    if (!newContactProfile.data) {
      console.log(`[complete-contact-transfer] No existing profile for ${transferRequest.new_contact_email}`);
      
      // We'll handle this by directing the user to register
      // For now, return a message indicating they need to register
      return new Response(JSON.stringify({ 
        error: 'new_user_required',
        message: 'The new contact needs to register an account first',
        email: transferRequest.new_contact_email,
        organization_name: organization.name
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get old contact info for notifications
    const { data: oldContactProfile } = await adminClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', transferRequest.current_contact_id)
      .single();

    // Update organization with new contact
    const { error: updateError } = await adminClient
      .from('organizations')
      .update({ 
        contact_person_id: newProfileId,
        updated_at: new Date().toISOString()
      })
      .eq('id', transferRequest.organization_id);

    if (updateError) {
      console.error('[complete-contact-transfer] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update organization' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the new contact's profile to reference this organization
    await adminClient
      .from('profiles')
      .update({ organization: organization.name })
      .eq('id', newProfileId);

    // Mark transfer as completed
    await adminClient
      .from('organization_transfer_requests')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', transferRequest.id);

    console.log(`[complete-contact-transfer] Transfer completed for org ${organization.name}`);

    // Send confirmation emails
    try {
      // Email to new contact
      await adminClient.functions.invoke('centralized-email-delivery', {
        body: {
          type: 'contact_transfer_complete',
          recipient: transferRequest.new_contact_email,
          data: {
            organization_name: organization.name,
            is_new_contact: true
          }
        }
      });

      // Email to old contact
      if (oldContactProfile?.email) {
        await adminClient.functions.invoke('centralized-email-delivery', {
          body: {
            type: 'contact_transfer_complete',
            recipient: oldContactProfile.email,
            data: {
              organization_name: organization.name,
              new_contact_email: transferRequest.new_contact_email,
              is_new_contact: false
            }
          }
        });
      }
    } catch (emailError) {
      console.error('[complete-contact-transfer] Email error:', emailError);
    }

    // Log to audit
    await adminClient.from('audit_log').insert({
      action: 'contact_transfer_completed',
      entity_type: 'organization',
      entity_id: transferRequest.organization_id,
      details: {
        old_contact_id: transferRequest.current_contact_id,
        new_contact_id: newProfileId,
        new_contact_email: transferRequest.new_contact_email,
        transfer_request_id: transferRequest.id
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      organization_name: organization.name,
      message: 'Transfer completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[complete-contact-transfer] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
