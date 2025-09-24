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
    console.log('🔧 Fix registration password function called');
    
    const { email } = await req.json();
    
    if (!email) {
      console.error('❌ Missing required field: email');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: email' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('🔍 Fixing password for user:', email);

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

    // Get the pending registration data to find the original password
    const { data: pendingReg, error: getPendingError } = await supabaseAdmin
      .from('pending_registrations')
      .select('email, password_hash, first_name, last_name')
      .eq('email', email)
      .eq('approval_status', 'approved')
      .single();

    if (getPendingError || !pendingReg) {
      console.error('❌ Pending registration not found:', getPendingError?.message);
      return new Response(
        JSON.stringify({ 
          error: `No approved pending registration found for ${email}`,
          details: getPendingError?.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    if (!pendingReg.password_hash) {
      console.error('❌ No password stored in pending registration');
      return new Response(
        JSON.stringify({ 
          error: 'No password found in the pending registration record'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('✅ Found pending registration with stored password');

    // Get user by email from the users list since getUserByEmail doesn't exist
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

    const user = allUsers.users.find(u => u.email === email);
    if (!user) {
      console.error('❌ User not found in auth.users');
      return new Response(
        JSON.stringify({ 
          error: `User account not found for ${email}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('✅ User found, updating password...');

    // Update user password using admin client (password_hash contains plaintext password)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: pendingReg.password_hash
    });

    if (error) {
      console.error('❌ Password update failed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('✅ Password updated successfully');

    return new Response(
      JSON.stringify({ 
        message: `Password updated successfully for ${email}. User can now login with their original registration password.`,
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
      JSON.stringify({ error: (error as any)?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})