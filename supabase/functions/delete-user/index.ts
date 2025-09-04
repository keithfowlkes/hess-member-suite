import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🗑️ Delete user function called');
    
    const { userId } = await req.json();
    
    if (!userId) {
      console.error('❌ Missing userId');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: userId' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('👤 Processing deletion for user:', userId);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create regular client for data operations (uses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // First check if user exists in auth.users
    console.log('🔍 Checking if user exists in auth...');
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    let authUserExists = false;
    let authDeleteSuccess = false;

    if (getUserError) {
      if (getUserError.message?.includes('User not found') || getUserError.code === 'user_not_found') {
        console.log('⚠️ User not found in auth.users (already deleted or orphaned profile)');
        authUserExists = false;
      } else {
        console.error('❌ Error checking user:', getUserError);
        return new Response(
          JSON.stringify({ error: `Error checking user: ${getUserError.message}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    } else if (userData.user) {
      console.log('✅ User exists in auth, proceeding with auth deletion...');
      authUserExists = true;
      
      // Delete from auth.users table
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authDeleteError) {
        console.error('❌ Error deleting from auth:', authDeleteError);
        return new Response(
          JSON.stringify({ error: `Failed to delete from auth: ${authDeleteError.message}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
      
      console.log('✅ Successfully deleted from auth.users');
      authDeleteSuccess = true;
    }

    // Clean up profile data regardless of auth user existence
    console.log('🧹 Cleaning up profile and related data...');

    // Get user profile for cleanup using admin client
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileFetchError) {
      console.error('❌ Error fetching profile:', profileFetchError);
      // Continue with cleanup even if we can't fetch the profile
    }

    let cleanupResults = {
      profileFound: !!profile,
      organizationsUpdated: 0,
      rolesDeleted: false,
      profileDeleted: false
    };

    if (profile) {
      console.log('👤 Found profile:', profile);
      
      // Remove as contact person from organizations using admin client
      console.log('🏢 Removing as contact person from organizations...');
      const { data: orgUpdateData, error: orgUpdateError } = await supabaseAdmin
        .from('organizations')
        .update({ contact_person_id: null })
        .eq('contact_person_id', profile.id)
        .select('id');

      if (orgUpdateError) {
        console.error('❌ Error updating organizations:', orgUpdateError);
      } else {
        cleanupResults.organizationsUpdated = orgUpdateData?.length || 0;
        console.log(`✅ Updated ${cleanupResults.organizationsUpdated} organizations`);
      }

      // Delete user roles using admin client
      console.log('🔐 Deleting user roles...');
      const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.error('❌ Error deleting user roles:', rolesError);
      } else {
        cleanupResults.rolesDeleted = true;
        console.log('✅ User roles deleted');
      }

      // Delete profile using admin client
      console.log('👤 Deleting user profile...');
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileDeleteError) {
        console.error('❌ Error deleting profile:', profileDeleteError);
      } else {
        cleanupResults.profileDeleted = true;
        console.log('✅ User profile deleted');
      }
    } else {
      console.log('⚠️ No profile found for cleanup');
    }

    // Log the action for audit purposes
    try {
      await supabaseAdmin.from('audit_log').insert({
        action: 'user_deleted',
        entity_type: 'user',
        entity_id: userId,
        details: { 
          authUserExists: authUserExists,
          authDeleteSuccess: authDeleteSuccess,
          cleanupResults: cleanupResults,
          deletedBy: 'admin_function'
        }
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log audit entry:', auditError);
      // Don't fail the whole operation for audit logging
    }

    const result = {
      message: authUserExists 
        ? 'User successfully deleted from both auth and profile data'
        : 'Profile data cleaned up (user was already removed from auth or was orphaned)',
      authUserExists: authUserExists,
      authDeleteSuccess: authDeleteSuccess,
      cleanup: cleanupResults
    };

    console.log('✅ Deletion process completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})