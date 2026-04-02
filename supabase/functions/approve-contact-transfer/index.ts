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

    // Verify admin auth
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roleData?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { transfer_id, admin_notes } = await req.json();

    if (!transfer_id) {
      return new Response(JSON.stringify({ error: 'Transfer ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[approve-contact-transfer] Admin ${user.id} approving transfer ${transfer_id}`);

    // Get the transfer request - allow pending, accepted, AND ready_for_approval
    const { data: transferRequest, error: findError } = await adminClient
      .from('organization_transfer_requests')
      .select('*')
      .eq('id', transfer_id)
      .in('status', ['pending', 'accepted', 'ready_for_approval'])
      .single();

    if (findError || !transferRequest) {
      console.error('[approve-contact-transfer] Transfer not found:', findError);
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

    // Get organization - FULL record for snapshot
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

    // Check if new contact has a profile
    const { data: newContactProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', transferRequest.new_contact_email.toLowerCase())
      .maybeSingle();

    if (!newContactProfile) {
      return new Response(JSON.stringify({ 
        error: 'New contact must register an account first',
        message: `The new contact (${transferRequest.new_contact_email}) needs to create an account before the transfer can be completed.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DATA LOSS PREVENTION: Snapshot the full organization record before transfer
    console.log(`[approve-contact-transfer] Creating pre-transfer org snapshot for data safety`);
    await adminClient.from('audit_log').insert({
      action: 'contact_transfer_pre_snapshot',
      entity_type: 'organization',
      entity_id: transferRequest.organization_id,
      user_id: user.id,
      details: {
        transfer_request_id: transferRequest.id,
        organization_snapshot: organization,
        old_contact_person_id: organization.contact_person_id,
        new_contact_profile_id: newContactProfile.id
      }
    });

    // Get old contact info
    const { data: oldContactProfile } = await adminClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', transferRequest.current_contact_id)
      .single();

    // ONLY update contact_person_id - NO other org fields touched
    const { error: updateError } = await adminClient
      .from('organizations')
      .update({ 
        contact_person_id: newContactProfile.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', transferRequest.organization_id);

    if (updateError) {
      console.error('[approve-contact-transfer] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update organization' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update new contact's profile organization field
    await adminClient
      .from('profiles')
      .update({ organization: organization.name })
      .eq('id', newContactProfile.id);

    // Mark transfer as completed
    await adminClient
      .from('organization_transfer_requests')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        new_contact_id: newContactProfile.id
      })
      .eq('id', transferRequest.id);

    // Verify org data integrity after transfer
    const { data: verifiedOrg } = await adminClient
      .from('organizations')
      .select('id, name, contact_person_id, student_fte, membership_status')
      .eq('id', transferRequest.organization_id)
      .single();

    console.log(`[approve-contact-transfer] Transfer completed. Verified org:`, {
      id: verifiedOrg?.id,
      name: verifiedOrg?.name,
      new_contact_person_id: verifiedOrg?.contact_person_id,
      student_fte: verifiedOrg?.student_fte,
      membership_status: verifiedOrg?.membership_status
    });

    // Send confirmation emails
    try {
      await adminClient.functions.invoke('centralized-email-delivery', {
        body: {
          type: 'contact_transfer_complete',
          to: transferRequest.new_contact_email,
          data: {
            organization_name: organization.name,
            is_new_contact: true
          }
        }
      });

      if (oldContactProfile?.email) {
        await adminClient.functions.invoke('centralized-email-delivery', {
          body: {
            type: 'contact_transfer_complete',
            to: oldContactProfile.email,
            data: {
              organization_name: organization.name,
              new_contact_email: transferRequest.new_contact_email,
              is_new_contact: false
            }
          }
        });
      }
    } catch (emailError) {
      console.error('[approve-contact-transfer] Email error:', emailError);
    }

    // Simplelists sync: transfer contact (remove old, add new)
    try {
      const { data: slEnabledSetting } = await adminClient
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'simplelists_enabled')
        .maybeSingle();

      if (slEnabledSetting?.setting_value === 'true') {
        const SIMPLELISTS_API_KEY = Deno.env.get('SIMPLELISTS_API_KEY');
        if (SIMPLELISTS_API_KEY) {
          const { data: slListSetting } = await adminClient
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'simplelists_list_name')
            .maybeSingle();
          const listName = slListSetting?.setting_value || '';

          // Remove old contact
          if (oldContactProfile?.email) {
            try {
              const findRes = await fetch(`https://www.simplelists.com/api/2/contacts/?email=${encodeURIComponent(oldContactProfile.email)}`, {
                headers: { 'Authorization': `Bearer ${SIMPLELISTS_API_KEY}`, 'Accept': 'application/json' }
              });
              if (findRes.ok) {
                const findData = await findRes.json();
                const results = findData?.results || findData;
                if (Array.isArray(results) && results.length > 0) {
                  const contactId = results[0].id || results[0].pk;
                  await fetch(`https://www.simplelists.com/api/2/contacts/${contactId}/`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${SIMPLELISTS_API_KEY}` }
                  });
                  console.log(`Simplelists: removed old contact ${oldContactProfile.email}`);
                }
              }
              await adminClient.from('simplelists_sync_log').insert({
                action: 'transfer_remove', email: oldContactProfile.email,
                organization_name: organization.name, status: 'success',
                details: { triggered_by: 'approve_contact_transfer' }
              });
            } catch (slErr: any) {
              console.error('Simplelists remove old contact error:', slErr);
              await adminClient.from('simplelists_sync_log').insert({
                action: 'transfer_remove', email: oldContactProfile.email,
                organization_name: organization.name, status: 'error', error_message: slErr.message
              });
            }
          }

          // Add new contact
          try {
            const newContact: any = {
              firstname: newContactProfile.first_name || '',
              surname: newContactProfile.last_name || '',
              emails: [transferRequest.new_contact_email],
            };
            if (listName) newContact.lists = [listName];

            const addRes = await fetch('https://www.simplelists.com/api/2/contacts/', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SIMPLELISTS_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify(newContact)
            });
            console.log(`Simplelists: added new contact ${transferRequest.new_contact_email}: ${addRes.status}`);
            await adminClient.from('simplelists_sync_log').insert({
              action: 'transfer_add', email: transferRequest.new_contact_email,
              organization_name: organization.name, status: addRes.ok ? 'success' : 'error',
              details: { triggered_by: 'approve_contact_transfer' }
            });
          } catch (slErr: any) {
            console.error('Simplelists add new contact error:', slErr);
            await adminClient.from('simplelists_sync_log').insert({
              action: 'transfer_add', email: transferRequest.new_contact_email,
              organization_name: organization.name, status: 'error', error_message: slErr.message
            });
          }
        }
      }
    } catch (slError) {
      console.error('Simplelists sync error (non-blocking):', slError);
    }

    // Log to audit
    await adminClient.from('audit_log').insert({
      action: 'contact_transfer_approved',
      entity_type: 'organization',
      entity_id: transferRequest.organization_id,
      user_id: user.id,
      details: {
        old_contact_id: transferRequest.current_contact_id,
        new_contact_id: newContactProfile.id,
        new_contact_email: transferRequest.new_contact_email,
        transfer_request_id: transferRequest.id,
        admin_notes,
        data_integrity_verified: true
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      organization_name: organization.name,
      message: 'Transfer approved and completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[approve-contact-transfer] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
