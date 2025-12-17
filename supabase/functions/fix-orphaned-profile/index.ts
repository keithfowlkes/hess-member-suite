import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { email, profileId, tempPassword } = await req.json();

    if (!email || !profileId) {
      return new Response(
        JSON.stringify({ error: 'Email and profileId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔧 Fixing orphaned profile for: ${email}, profile ID: ${profileId}`);

    // Check if auth user already exists for this email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users', details: listError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    
    if (existingUser) {
      console.log(`⚠️ Auth user already exists for ${email} with ID: ${existingUser.id}`);
      
      // Check if there's a duplicate profile created by the trigger
      const { data: duplicateProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', existingUser.id)
        .neq('id', profileId)
        .maybeSingle();

      if (duplicateProfile) {
        console.log(`🗑️ Deleting duplicate profile: ${duplicateProfile.id}`);
        await supabaseAdmin.from('profiles').delete().eq('id', duplicateProfile.id);
      }

      // Update the profile to use the existing auth user
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ user_id: existingUser.id })
        .eq('id', profileId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update profile', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Ensure user has member role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: existingUser.id, role: 'member' }, { onConflict: 'user_id,role' });

      if (roleError) {
        console.error('Error setting user role:', roleError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Profile linked to existing auth user',
          authUserId: existingUser.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new auth user
    const password = tempPassword || `TempPass${Math.random().toString(36).slice(2)}!`;
    
    console.log(`📝 Creating new auth user for: ${email}`);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {}
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create auth user', details: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Auth user created with ID: ${newUser.user.id}`);

    // Update the profile's user_id to point to the new auth user
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ user_id: newUser.user.id })
      .eq('id', profileId);

    if (updateProfileError) {
      console.error('Error updating profile user_id:', updateProfileError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: updateProfileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Profile ${profileId} updated with new user_id: ${newUser.user.id}`);

    // Create member role for the new user
    const { error: roleCreateError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'member' });

    if (roleCreateError) {
      console.error('Error creating user role:', roleCreateError);
      // Don't fail the whole operation for this
    } else {
      console.log(`✅ Member role assigned to user ${newUser.user.id}`);
    }

    // Log the action
    await supabaseAdmin.from('audit_log').insert({
      action: 'fix_orphaned_profile',
      entity_type: 'profile',
      entity_id: profileId,
      details: {
        email: email,
        new_auth_user_id: newUser.user.id,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Auth user created and profile linked successfully',
        authUserId: newUser.user.id,
        tempPassword: password,
        note: 'User should reset their password on first login'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
