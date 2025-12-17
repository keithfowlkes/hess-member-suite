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

    const { transfer_token } = await req.json();

    if (!transfer_token) {
      return new Response(JSON.stringify({ error: 'Transfer token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[complete-contact-transfer] Processing transfer acceptance with token`);

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
    const { data: newContactProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', transferRequest.new_contact_email.toLowerCase())
      .maybeSingle();

    // Mark transfer as "accepted" - awaiting admin approval
    // Do NOT complete the transfer yet - admin must approve
    await adminClient
      .from('organization_transfer_requests')
      .update({ 
        status: 'accepted',
        new_contact_id: newContactProfile?.id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', transferRequest.id);

    console.log(`[complete-contact-transfer] Transfer marked as accepted, awaiting admin approval`);

    // Send notification to admin about pending approval
    try {
      await adminClient.functions.invoke('send-admin-notification', {
        body: {
          type: 'contact_transfer_accepted',
          updateData: {
            organization_name: organization.name,
            new_contact_email: transferRequest.new_contact_email,
            has_account: !!newContactProfile
          }
        }
      });
    } catch (notifyError) {
      console.error('[complete-contact-transfer] Admin notification error:', notifyError);
    }

    // Log to audit
    await adminClient.from('audit_log').insert({
      action: 'contact_transfer_accepted',
      entity_type: 'organization',
      entity_id: transferRequest.organization_id,
      details: {
        new_contact_email: transferRequest.new_contact_email,
        transfer_request_id: transferRequest.id,
        has_existing_account: !!newContactProfile
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      organization_name: organization.name,
      requires_admin_approval: true,
      message: 'Transfer accepted! An administrator will review and complete the transfer shortly.'
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
