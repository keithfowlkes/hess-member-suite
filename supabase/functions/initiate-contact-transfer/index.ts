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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { organization_id, new_contact_email, organization_name } = await req.json();

    if (!organization_id || !new_contact_email || !organization_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[initiate-contact-transfer] User ${user.id} initiating transfer for org ${organization_id} to ${new_contact_email}`);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user is the primary contact
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('id, contact_person_id, name')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (org.contact_person_id !== profile.id) {
      return new Response(JSON.stringify({ error: 'Only the primary contact can initiate a transfer' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for existing pending transfer
    const { data: existingTransfer } = await adminClient
      .from('organization_transfer_requests')
      .select('id')
      .eq('organization_id', organization_id)
      .in('status', ['pending', 'accepted', 'ready_for_approval'])
      .maybeSingle();

    if (existingTransfer) {
      return new Response(JSON.stringify({ error: 'A transfer request is already pending for this organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate secure transfer token
    const transferToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Check if new contact email already has a profile
    const { data: newContactProfile } = await adminClient
      .from('profiles')
      .select('id, user_id')
      .eq('email', new_contact_email.toLowerCase())
      .maybeSingle();

    // Create transfer request
    const { data: transferRequest, error: insertError } = await adminClient
      .from('organization_transfer_requests')
      .insert({
        organization_id,
        requested_by: user.id,
        current_contact_id: profile.id,
        new_contact_email: new_contact_email.toLowerCase(),
        new_contact_id: newContactProfile?.id || null,
        transfer_token: transferToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[initiate-contact-transfer] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create transfer request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[initiate-contact-transfer] Transfer request created: ${transferRequest.id}`);

    const siteUrl = 'https://members.hessconsortium.app';
    const transferLink = `${siteUrl}/auth?action=accept-transfer&token=${transferToken}`;

    // Send email to NEW contact with registration + update instructions
    try {
      await adminClient.functions.invoke('centralized-email-delivery', {
        body: {
          type: 'contact_transfer',
          to: new_contact_email,
          data: {
            organization_name: organization_name,
            current_contact_name: `${profile.first_name} ${profile.last_name}`,
            current_contact_email: profile.email,
            transfer_link: transferLink,
            expires_at: expiresAt.toLocaleDateString(),
            site_url: siteUrl
          }
        }
      });
      console.log(`[initiate-contact-transfer] Email sent to new contact: ${new_contact_email}`);
    } catch (emailError) {
      console.error('[initiate-contact-transfer] Email error (new contact):', emailError);
    }

    // Send confirmation email to CURRENT contact
    try {
      await adminClient.functions.invoke('centralized-email-delivery', {
        body: {
          type: 'contact_transfer_confirmation',
          to: profile.email,
          data: {
            organization_name: organization_name,
            new_contact_email: new_contact_email,
            current_contact_name: `${profile.first_name} ${profile.last_name}`,
            expires_at: expiresAt.toLocaleDateString()
          }
        }
      });
      console.log(`[initiate-contact-transfer] Confirmation email sent to current contact: ${profile.email}`);
    } catch (emailError) {
      console.error('[initiate-contact-transfer] Email error (current contact):', emailError);
    }

    // Send notification to admin
    try {
      await adminClient.functions.invoke('send-admin-notification', {
        body: {
          type: 'contact_transfer_initiated',
          updateData: {
            organization_name: organization_name,
            current_contact_email: profile.email,
            new_contact_email: new_contact_email
          }
        }
      });
    } catch (adminNotifyError) {
      console.error('[initiate-contact-transfer] Admin notification error:', adminNotifyError);
    }

    // Log to audit
    await adminClient.from('audit_log').insert({
      action: 'contact_transfer_initiated',
      entity_type: 'organization',
      entity_id: organization_id,
      user_id: user.id,
      details: {
        new_contact_email,
        transfer_request_id: transferRequest.id
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      transfer_id: transferRequest.id,
      message: 'Transfer request created and emails sent to both contacts'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[initiate-contact-transfer] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
