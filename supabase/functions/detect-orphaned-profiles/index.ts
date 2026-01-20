import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrphanedProfile {
  profileId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  organizationId: string | null;
  organizationName: string | null;
  issue: 'no_auth_user' | 'email_mismatch';
  authEmail?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'detect'; // 'detect' or 'fix'
    const profileIds = body.profileIds || []; // For fix action

    console.log(`🔍 Detect orphaned profiles - Action: ${action}`);

    if (action === 'fix' && profileIds.length > 0) {
      // Fix specified profiles
      const results = [];
      
      for (const profileId of profileIds) {
        try {
          // Get profile details
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, user_id, email, first_name, last_name, organization')
            .eq('id', profileId)
            .single();

          if (profileError || !profile) {
            results.push({ profileId, success: false, error: 'Profile not found' });
            continue;
          }

          // Check if auth user exists
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
          
          if (!authError && authData?.user) {
            // Auth user exists - check for email mismatch
            if (authData.user.email?.toLowerCase() !== profile.email.toLowerCase()) {
              // Fix email mismatch
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
                email: profile.email,
                email_confirm: true,
              });
              
              if (updateError) {
                results.push({ profileId, email: profile.email, success: false, error: updateError.message });
              } else {
                results.push({ profileId, email: profile.email, success: true, action: 'email_synced' });
              }
            } else {
              results.push({ profileId, email: profile.email, success: true, action: 'already_valid' });
            }
            continue;
          }

          // Auth user doesn't exist - create it
          const tempPassword = `TempPass${Math.random().toString(36).slice(2)}!${Math.random().toString(36).slice(2)}`;
          
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: profile.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              first_name: profile.first_name,
              last_name: profile.last_name,
              organization: profile.organization,
            }
          });

          if (createError) {
            // Check if user already exists with this email
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === profile.email.toLowerCase());
            
            if (existingUser) {
              // Link profile to existing user
              const { error: updateProfileError } = await supabaseAdmin
                .from('profiles')
                .update({ user_id: existingUser.id })
                .eq('id', profileId);
              
              if (updateProfileError) {
                results.push({ profileId, email: profile.email, success: false, error: updateProfileError.message });
              } else {
                // Ensure member role exists
                await supabaseAdmin.from('user_roles').upsert(
                  { user_id: existingUser.id, role: 'member' },
                  { onConflict: 'user_id,role' }
                );
                results.push({ profileId, email: profile.email, success: true, action: 'linked_existing', authUserId: existingUser.id });
              }
            } else {
              results.push({ profileId, email: profile.email, success: false, error: createError.message });
            }
            continue;
          }

          // Delete any duplicate profiles created by trigger
          await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('user_id', newUser.user.id)
            .neq('id', profileId);

          // Update profile to point to new user
          const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({ user_id: newUser.user.id })
            .eq('id', profileId);

          if (updateProfileError) {
            results.push({ profileId, email: profile.email, success: false, error: updateProfileError.message });
            continue;
          }

          // Ensure member role exists
          await supabaseAdmin.from('user_roles').upsert(
            { user_id: newUser.user.id, role: 'member' },
            { onConflict: 'user_id,role' }
          );

          // Log the fix
          await supabaseAdmin.from('audit_log').insert({
            action: 'bulk_fix_orphaned_profile',
            entity_type: 'profile',
            entity_id: profileId,
            details: {
              email: profile.email,
              new_auth_user_id: newUser.user.id,
              timestamp: new Date().toISOString()
            }
          });

          results.push({ 
            profileId, 
            email: profile.email, 
            success: true, 
            action: 'created_auth_user',
            authUserId: newUser.user.id,
            note: 'User should use Forgot Password to set their password'
          });

        } catch (error) {
          results.push({ profileId, success: false, error: (error as Error).message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detection mode
    const orphanedProfiles: OrphanedProfile[] = [];

    // Get all profiles with their organization info
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        user_id,
        email,
        first_name,
        last_name,
        organization
      `)
      .order('email');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles', details: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Checking ${profiles?.length || 0} profiles...`);

    // Get organizations for lookup
    const { data: organizations } = await supabaseAdmin
      .from('organizations')
      .select('id, name, contact_person_id');

    const orgMap = new Map(organizations?.map(o => [o.contact_person_id, { id: o.id, name: o.name }]) || []);

    // Check each profile
    for (const profile of profiles || []) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        
        const orgInfo = orgMap.get(profile.id);

        if (authError || !authData?.user) {
          // No auth user exists
          orphanedProfiles.push({
            profileId: profile.id,
            userId: profile.user_id,
            email: profile.email,
            firstName: profile.first_name,
            lastName: profile.last_name,
            organization: profile.organization,
            organizationId: orgInfo?.id || null,
            organizationName: orgInfo?.name || null,
            issue: 'no_auth_user'
          });
        } else if (authData.user.email?.toLowerCase() !== profile.email.toLowerCase()) {
          // Email mismatch
          orphanedProfiles.push({
            profileId: profile.id,
            userId: profile.user_id,
            email: profile.email,
            firstName: profile.first_name,
            lastName: profile.last_name,
            organization: profile.organization,
            organizationId: orgInfo?.id || null,
            organizationName: orgInfo?.name || null,
            issue: 'email_mismatch',
            authEmail: authData.user.email
          });
        }
      } catch (error) {
        console.error(`Error checking profile ${profile.email}:`, error);
      }
    }

    console.log(`⚠️ Found ${orphanedProfiles.length} orphaned profiles`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalChecked: profiles?.length || 0,
        orphanedCount: orphanedProfiles.length,
        orphanedProfiles 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
