import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client with proper configuration
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    const { email, adminUserId } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cleaning up orphaned records for email: ${email}`);

    const cleanupResults = {
      pendingRegistrations: 0,
      organizations: 0,
      profiles: 0,
      userRoles: 0,
      authUsers: 0
    };

    // 1. Delete pending registrations for this email
    const { data: deletedPendingRegs, error: pendingError } = await supabaseAdmin
      .from('pending_registrations')
      .delete()
      .eq('email', email)
      .select('id');

    if (pendingError) {
      console.error('Error deleting pending registrations:', pendingError);
    } else {
      cleanupResults.pendingRegistrations = deletedPendingRegs?.length || 0;
      console.log(`Deleted ${cleanupResults.pendingRegistrations} pending registrations`);
    }

    // 2. Delete organizations with this email (that might be orphaned)
    const { data: deletedOrgs, error: orgError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('email', email)
      .select('id, name');

    if (orgError) {
      console.error('Error deleting organizations:', orgError);
    } else {
      cleanupResults.organizations = deletedOrgs?.length || 0;
      console.log(`Deleted ${cleanupResults.organizations} organizations`);
      
      // Log each deleted organization
      if (deletedOrgs) {
        deletedOrgs.forEach(org => {
          console.log(`Deleted organization: ${org.name} (ID: ${org.id})`);
        });
      }
    }

    // 3. Find and clean up any profiles with this email
    const { data: profilesWithEmail, error: profilesFetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, first_name, last_name')
      .eq('email', email);

    if (profilesFetchError) {
      console.error('Error fetching profiles:', profilesFetchError);
    } else if (profilesWithEmail && profilesWithEmail.length > 0) {
      // Clean up user roles and auth users for each profile
      for (const profile of profilesWithEmail) {
        if (profile.user_id) {
          // Delete user roles
          const { data: deletedRoles, error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .delete()
            .eq('user_id', profile.user_id)
            .select('id');

          if (rolesError) {
            console.error(`Error deleting roles for user ${profile.user_id}:`, rolesError);
          } else {
            cleanupResults.userRoles += deletedRoles?.length || 0;
          }

          // Delete auth user
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profile.user_id);

          if (authError) {
            if (authError.message?.includes('User not found') || (authError as any).code === 'user_not_found') {
              console.log(`Auth user already deleted: ${profile.user_id}`);
            } else {
              console.error(`Error deleting auth user ${profile.user_id}:`, authError);
            }
          } else {
            cleanupResults.authUsers++;
            console.log(`Deleted auth user: ${profile.user_id}`);
          }
        }

        // Delete profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', profile.id);

        if (profileError) {
          console.error(`Error deleting profile ${profile.id}:`, profileError);
        } else {
          cleanupResults.profiles++;
          console.log(`Deleted profile: ${profile.first_name} ${profile.last_name} (${profile.id})`);
        }
      }
    }

    // 4. Log the cleanup operation for audit purposes
    if (adminUserId) {
      await supabaseAdmin.from('audit_log').insert({
        action: 'orphaned_records_cleanup',
        entity_type: 'cleanup',
        user_id: adminUserId,
        details: {
          email: email,
          cleanupResults: cleanupResults,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log(`Cleanup completed for ${email}:`, cleanupResults);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully cleaned up orphaned records for ${email}`,
        results: cleanupResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in cleanup:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);