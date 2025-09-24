import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Create external user function called');

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    const { firstName, lastName, email, password, role } = await req.json();

    console.log(`👤 Creating external user: ${firstName} ${lastName} (${email}) with role: ${role}`);

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      throw new Error('Missing required fields: firstName, lastName, email, password');
    }

    // Check if user already exists
    // List all users to find by email since getUserByEmail doesn't exist in newer versions
    const { data: allUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      throw new Error('Failed to list users');
    }
    
    const existingUser = allUsers.users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Determine or create a serialized Administrator organization name
    const { data: existingAdminOrgs, error: fetchAdminOrgsError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('organization_type', 'system')
      .ilike('name', 'Administrator%');

    if (fetchAdminOrgsError) {
      console.error('❌ Error fetching admin orgs:', fetchAdminOrgsError);
      throw fetchAdminOrgsError;
    }

    let nextIndex = 1;
    let hasBase = false;
    for (const org of (existingAdminOrgs || [])) {
      if (org.name === 'Administrator') {
        hasBase = true;
        nextIndex = Math.max(nextIndex, 2);
      } else {
        const match = org.name.match(/^Administrator\s*#(\d+)$/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n)) nextIndex = Math.max(nextIndex, n + 1);
        }
      }
    }

    const adminOrgName = hasBase ? `Administrator #${nextIndex}` : 'Administrator';
    console.log(`🏢 Using administrator organization name: ${adminOrgName}`);

    // Ensure the organization exists
    let adminOrgId: string | undefined;
    const { data: existingExact, error: existExactErr } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', adminOrgName)
      .maybeSingle();

    if (existExactErr) {
      console.error('❌ Error checking exact admin org:', existExactErr);
      throw existExactErr;
    }

    if (!existingExact) {
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: adminOrgName,
          email: 'admin@system.local',
          membership_status: 'active',
          annual_fee_amount: 0,
          country: 'United States',
          organization_type: 'system'
        })
        .select('id')
        .single();
      if (orgError) {
        console.error('❌ Error creating admin org:', orgError);
        throw orgError;
      }
      adminOrgId = newOrg.id;
      console.log(`✅ Administrator organization created with ID: ${adminOrgId}`);
    } else {
      adminOrgId = existingExact.id;
      console.log(`✅ Using existing Administrator organization: ${adminOrgId}`);
    }

    // Create the auth user (profile and any org insertion will be handled by DB trigger using metadata)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for external users
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        organization: adminOrgName,
        isExternalUser: true
      }
    });

    if (authError) {
      console.error('❌ Auth creation error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    console.log(`✅ Auth user created with ID: ${authData.user.id}`);

    // Set desired role explicitly (replace any default from trigger)
    const { error: deleteRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', authData.user.id);
    if (deleteRolesError) {
      console.warn('⚠️ Role cleanup warning (non-fatal):', deleteRolesError);
    }

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authData.user.id, role });

    if (roleError) {
      console.error('❌ Role assignment error:', roleError);
      // Clean up auth user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    console.log(`✅ Role ${role} assigned to user: ${authData.user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `External user ${firstName} ${lastName} created successfully`,
        userId: authData.user.id,
        email,
        role,
        organization: adminOrgName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Create external user error:', error);
    return new Response(
      JSON.stringify({ error: (error as any).message, details: 'Failed to create external user' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})