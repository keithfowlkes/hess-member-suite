import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SIMPLELISTS_API_BASE = 'https://www.simplelists.com/api/2';

interface SimplelistsContact {
  firstname?: string;
  surname?: string;
  emails: string[];
  lists?: string[];
}

async function simplelistsRequest(method: string, path: string, body?: any) {
  const apiKey = Deno.env.get('SIMPLELISTS_API_KEY');
  if (!apiKey) throw new Error('SIMPLELISTS_API_KEY not configured');

  const url = `${SIMPLELISTS_API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const options: RequestInit = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(body);
  }

  console.log(`[simplelists-sync] ${method} ${url}`);
  const response = await fetch(url, options);
  const text = await response.text();
  
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    console.error(`[simplelists-sync] API error ${response.status}:`, data);
    throw new Error(`Simplelists API error ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }

  return data;
}

async function findContactByEmail(email: string) {
  try {
    const data = await simplelistsRequest('GET', `/contacts/?email=${encodeURIComponent(email)}`);
    // V2 API returns paginated results
    const results = data?.results || data;
    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }
    return null;
  } catch (error) {
    console.log(`[simplelists-sync] Contact not found for ${email}:`, error.message);
    return null;
  }
}

async function addContact(firstname: string, surname: string, email: string, listName?: string) {
  const params = new URLSearchParams();
  params.append('firstname', firstname);
  params.append('surname', surname);
  params.append('emails', email);
  if (listName) {
    params.append('lists', listName);
  }

  const apiKey = Deno.env.get('SIMPLELISTS_API_KEY');
  if (!apiKey) throw new Error('SIMPLELISTS_API_KEY not configured');

  const url = `${SIMPLELISTS_API_BASE}/contacts/`;
  console.log(`[simplelists-sync] POST ${url}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: params,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!response.ok) {
    console.error(`[simplelists-sync] API error ${response.status}:`, data);
    throw new Error(`Simplelists API error ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function removeContactByEmail(email: string) {
  const contact = await findContactByEmail(email);
  if (!contact) {
    console.log(`[simplelists-sync] No contact found for ${email}, skipping removal`);
    return { skipped: true, reason: 'Contact not found' };
  }
  const contactId = contact.id || contact.pk;
  return await simplelistsRequest('DELETE', `/contacts/${contactId}/`);
}

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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: roleData } = await adminClient
      .from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = roleData?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, ...params } = await req.json();
    console.log(`[simplelists-sync] Action: ${action}`, params);

    // Get list name from system settings
    const { data: listSetting } = await adminClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'simplelists_list_name')
      .maybeSingle();
    const listName = params.list_name || listSetting?.setting_value || '';

    // Check if Simplelists integration is enabled
    const { data: enabledSetting } = await adminClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'simplelists_enabled')
      .maybeSingle();
    const isEnabled = enabledSetting?.setting_value === 'true';

    // For non-test actions, check if enabled
    if (action !== 'test_connection' && action !== 'update_settings' && !isEnabled) {
      return new Response(JSON.stringify({ error: 'Simplelists integration is disabled' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let result: any;

    switch (action) {
      case 'test_connection': {
        try {
          const data = await simplelistsRequest('GET', '/contacts/?limit=1');
          result = { connected: true, message: 'Successfully connected to Simplelists API', data };
        } catch (error) {
          result = { connected: false, message: error.message };
        }
        break;
      }

      case 'update_settings': {
        const { enabled, list_name: newListName, sync_secondary } = params;
        
        // Upsert settings
        const settings = [
          { setting_key: 'simplelists_enabled', setting_value: String(enabled ?? false), description: 'Whether Simplelists sync is enabled' },
          { setting_key: 'simplelists_list_name', setting_value: newListName || '', description: 'Simplelists list name for contact sync' },
          { setting_key: 'simplelists_sync_secondary', setting_value: String(sync_secondary ?? false), description: 'Whether to sync secondary contacts to Simplelists' },
        ];

        for (const s of settings) {
          const { data: existing } = await adminClient
            .from('system_settings')
            .select('id')
            .eq('setting_key', s.setting_key)
            .maybeSingle();

          if (existing) {
            await adminClient.from('system_settings')
              .update({ setting_value: s.setting_value, updated_at: new Date().toISOString() })
              .eq('setting_key', s.setting_key);
          } else {
            await adminClient.from('system_settings').insert(s);
          }
        }

        result = { success: true, message: 'Settings updated' };
        break;
      }

      case 'add_contacts': {
        const { contacts } = params;
        if (!contacts || !Array.isArray(contacts)) {
          return new Response(JSON.stringify({ error: 'contacts array required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const results = [];
        for (const contact of contacts) {
          try {
            const res = await addContact(contact.firstname, contact.surname, contact.email, listName);
            results.push({ email: contact.email, status: 'success', data: res });
            
            await adminClient.from('simplelists_sync_log').insert({
              action: 'add', email: contact.email,
              organization_name: contact.organization_name || null,
              status: 'success', details: { response: res, list_name: listName }
            });
          } catch (error) {
            results.push({ email: contact.email, status: 'error', error: error.message });
            
            await adminClient.from('simplelists_sync_log').insert({
              action: 'add', email: contact.email,
              organization_name: contact.organization_name || null,
              status: 'error', error_message: error.message
            });
          }
        }
        result = { results };
        break;
      }

      case 'remove_contact': {
        const { email } = params;
        if (!email) {
          return new Response(JSON.stringify({ error: 'email required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const res = await removeContactByEmail(email);
          result = { success: true, data: res };
          
          await adminClient.from('simplelists_sync_log').insert({
            action: 'remove', email,
            organization_name: params.organization_name || null,
            status: 'success', details: { response: res }
          });
        } catch (error) {
          result = { success: false, error: error.message };
          
          await adminClient.from('simplelists_sync_log').insert({
            action: 'remove', email,
            organization_name: params.organization_name || null,
            status: 'error', error_message: error.message
          });
        }
        break;
      }

      case 'transfer_contact': {
        const { old_email, new_firstname, new_surname, new_email, organization_name } = params;
        if (!old_email || !new_email) {
          return new Response(JSON.stringify({ error: 'old_email and new_email required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const transferResults: any = { remove_old: null, add_new: null };

        // Remove old contact
        try {
          transferResults.remove_old = await removeContactByEmail(old_email);
          await adminClient.from('simplelists_sync_log').insert({
            action: 'transfer_remove', email: old_email,
            organization_name, status: 'success',
            details: { response: transferResults.remove_old, transfer_to: new_email }
          });
        } catch (error) {
          transferResults.remove_old = { error: error.message };
          await adminClient.from('simplelists_sync_log').insert({
            action: 'transfer_remove', email: old_email,
            organization_name, status: 'error', error_message: error.message
          });
        }

        // Add new contact
        try {
          transferResults.add_new = await addContact(new_firstname || '', new_surname || '', new_email, listName);
          await adminClient.from('simplelists_sync_log').insert({
            action: 'transfer_add', email: new_email,
            organization_name, status: 'success',
            details: { response: transferResults.add_new, transferred_from: old_email }
          });
        } catch (error) {
          transferResults.add_new = { error: error.message };
          await adminClient.from('simplelists_sync_log').insert({
            action: 'transfer_add', email: new_email,
            organization_name, status: 'error', error_message: error.message
          });
        }

        result = transferResults;
        break;
      }

      case 'sync_all_members': {
        // Fetch all active organizations with their contacts
        const { data: orgs, error: orgsError } = await adminClient
          .from('organizations')
          .select('name, email, contact_person_id, secondary_contact_email, secondary_first_name, secondary_last_name, profiles:contact_person_id(first_name, last_name, email)')
          .eq('membership_status', 'active');

        if (orgsError) throw orgsError;

        const syncResults = [];
        const { data: syncSecondarySetting } = await adminClient
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'simplelists_sync_secondary')
          .maybeSingle();
        const syncSecondary = syncSecondarySetting?.setting_value === 'true';

        for (const org of (orgs || [])) {
          const profile = org.profiles as any;
          if (profile?.email) {
            try {
              const res = await addContact(profile.first_name || '', profile.last_name || '', profile.email, listName);
              syncResults.push({ email: profile.email, org: org.name, status: 'success' });
              await adminClient.from('simplelists_sync_log').insert({
                action: 'bulk_sync', email: profile.email,
                organization_name: org.name, status: 'success'
              });
            } catch (error) {
              syncResults.push({ email: profile.email, org: org.name, status: 'error', error: error.message });
              await adminClient.from('simplelists_sync_log').insert({
                action: 'bulk_sync', email: profile.email,
                organization_name: org.name, status: 'error', error_message: error.message
              });
            }
          }

          // Sync secondary contact if enabled
          if (syncSecondary && org.secondary_contact_email) {
            try {
              const res = await addContact(
                org.secondary_first_name || '', org.secondary_last_name || '',
                org.secondary_contact_email, listName
              );
              syncResults.push({ email: org.secondary_contact_email, org: org.name, status: 'success', type: 'secondary' });
            } catch (error) {
              syncResults.push({ email: org.secondary_contact_email, org: org.name, status: 'error', type: 'secondary', error: error.message });
            }
          }
        }

        result = { synced: syncResults.length, results: syncResults };
        break;
      }

      case 'get_settings': {
        const { data: settings } = await adminClient
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['simplelists_enabled', 'simplelists_list_name', 'simplelists_sync_secondary']);

        const settingsMap: Record<string, string> = {};
        settings?.forEach(s => { settingsMap[s.setting_key] = s.setting_value || ''; });

        result = {
          enabled: settingsMap.simplelists_enabled === 'true',
          list_name: settingsMap.simplelists_list_name || '',
          sync_secondary: settingsMap.simplelists_sync_secondary === 'true',
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[simplelists-sync] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
