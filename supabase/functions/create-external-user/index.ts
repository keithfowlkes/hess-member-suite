import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { firstName, lastName, email, password, role } = await req.json();

    console.log(`👤 Creating external user: ${firstName} ${lastName} (${email}) with role: ${role}`);

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      throw new Error('Missing required fields: firstName, lastName, email, password');
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    if (existingUser.user) {
      throw new Error('User with this email already exists');
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for external users
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        organization: 'System Administrator',
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

    // Ensure administrator organization exists
    let adminOrgId;
    const { data: adminOrg, error: orgSelectError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', 'System Administrator')
      .single();

    if (orgSelectError && orgSelectError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error checking admin org:', orgSelectError);
      throw orgSelectError;
    }

    if (!adminOrg) {
      console.log('🏢 Creating System Administrator organization');
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: 'System Administrator',
          email: 'admin@system.local',
          membership_status: 'active',
          annual_fee_amount: 0,
          country: 'United States'
        })
        .select('id')
        .single();

      if (orgError) {
        console.error('❌ Error creating admin org:', orgError);
        throw orgError;
      }

      adminOrgId = newOrg.id;
      console.log(`✅ System Administrator organization created with ID: ${adminOrgId}`);
    } else {
      adminOrgId = adminOrg.id;
      console.log(`✅ Using existing System Administrator organization: ${adminOrgId}`);
    }

    // Create the profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        organization: 'System Administrator'
      });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    console.log(`✅ Profile created for user: ${authData.user.id}`);

    // Assign user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role
      });

    if (roleError) {
      console.error('❌ Role assignment error:', roleError);
      // Clean up auth user and profile if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    console.log(`✅ Role ${role} assigned to user: ${authData.user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `External user ${firstName} ${lastName} created successfully`,
        userId: authData.user.id,
        email: email,
        role: role
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Create external user error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to create external user'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})