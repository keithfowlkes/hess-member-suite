import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('🧹 Cleanup orphaned profiles function called');

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

    // Create regular client for data operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get all profiles
    console.log('📋 Fetching all profiles...');
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, user_id, email, first_name, last_name');

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log(`📊 Found ${profiles?.length || 0} profiles to check`);

    const orphanedProfiles = [];
    const cleanupErrors = [];

    // Check each profile to see if the auth user exists
    for (const profile of profiles || []) {
      try {
        console.log(`🔍 Checking profile ${profile.user_id} (${profile.email})...`);
        
        const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        
        if (getUserError || !userData.user) {
          console.log(`⚠️ Orphaned profile found: ${profile.email} (${profile.user_id})`);
          orphanedProfiles.push(profile);
          
          // Clean up this orphaned profile
          console.log(`🧹 Cleaning up orphaned profile: ${profile.email}`);
          
          // Remove as contact person from organizations
          await supabaseClient
            .from('organizations')
            .update({ contact_person_id: null })
            .eq('contact_person_id', profile.id);

          // Delete user roles
          await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', profile.user_id);

          // Delete profile
          await supabaseClient
            .from('profiles')
            .delete()
            .eq('user_id', profile.user_id);

          console.log(`✅ Cleaned up orphaned profile: ${profile.email}`);
        } else {
          console.log(`✅ Profile ${profile.email} has valid auth user`);
        }
      } catch (error) {
        console.error(`❌ Error processing profile ${profile.email}:`, error);
        cleanupErrors.push({
          profile: profile.email,
          error: error.message
        });
      }
    }

    const result = {
      totalProfilesChecked: profiles?.length || 0,
      orphanedProfilesFound: orphanedProfiles.length,
      orphanedProfilesCleaned: orphanedProfiles.length - cleanupErrors.length,
      errors: cleanupErrors,
      orphanedProfiles: orphanedProfiles.map(p => ({
        email: p.email,
        userId: p.user_id,
        name: `${p.first_name} ${p.last_name}`
      }))
    };

    console.log('📊 Cleanup completed:', result);

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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})