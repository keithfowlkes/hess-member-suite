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
    console.log('🔑 Change user password function called');
    
    const { userId, userEmail, newPassword } = await req.json();
    
    if ((!userId && !userEmail) || !newPassword) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: (userId OR userEmail) and newPassword' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

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

    let targetUserId = userId;
    
    // If userEmail is provided instead of userId, look up the user
    if (!targetUserId && userEmail) {
      console.log('👤 Looking up user by email:', userEmail);
      const { data: allUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Failed to list users:', listError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to find user account',
            details: listError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      const user = allUsers.users.find(u => u.email === userEmail);
      if (!user) {
        console.error('❌ User not found by email:', userEmail);
        return new Response(
          JSON.stringify({ 
            error: `User not found with email: ${userEmail}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      
      targetUserId = user.id;
      console.log('✅ Found user by email, ID:', targetUserId);
    }

    console.log('👤 Changing password for user:', targetUserId);

    // First check if user exists in auth.users
    console.log('🔍 Checking if user exists in auth...');
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    
    if (getUserError || !userData.user) {
      console.error('❌ User not found in auth.users:', getUserError?.message || 'No user data');
      return new Response(
        JSON.stringify({ 
          error: `User not found. The user may have been deleted from authentication system.`,
          details: getUserError?.message || 'User does not exist in auth.users'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('✅ User exists, proceeding with password change...');

    // Update user password using admin client
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword
    });

    if (error) {
      console.error('❌ Password change failed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('✅ Password changed successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Password updated successfully',
        user: data.user 
      }),
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