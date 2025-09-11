import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { requestId, adminUserId } = await req.json();
    
    if (!requestId || !adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing requestId or adminUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing approval for reassignment request: ${requestId} by admin: ${adminUserId}`);

    // Get the reassignment request
    const { data: reassignmentReq, error: fetchError } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !reassignmentReq) {
      console.error('Error fetching reassignment request:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Reassignment request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found reassignment request for: ${reassignmentReq.new_contact_email}`);

    // Create the auth user if user registration data is provided
    if (reassignmentReq.user_registration_data) {
      const userData = reassignmentReq.user_registration_data;
      
      // Check if user already exists
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(userData.email);
      
      if (!existingUser.user) {
        console.log(`Creating auth user for: ${userData.email}`);
        
        // Create the auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: Math.random().toString(36).slice(-8) + 'A1!', // Temporary password
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            organization: reassignmentReq.new_organization_data?.name,
            isPrivateNonProfit: userData.is_private_nonprofit,
            // Include all organization data in metadata for handle_new_user trigger
            ...Object.keys(reassignmentReq.new_organization_data || {}).reduce((acc, key) => {
              const value = reassignmentReq.new_organization_data[key];
              // Convert snake_case to camelCase for metadata
              const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
              acc[camelKey] = value?.toString() || '';
              return acc;
            }, {} as Record<string, any>)
          }
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          return new Response(
            JSON.stringify({ error: `Failed to create user account: ${authError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Created auth user: ${authUser.user?.id} for email: ${userData.email}`);

        // Wait for trigger to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Send password reset email so user can set their password
        try {
          const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: userData.email,
            options: {
              redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/auth/v1/verify?redirect_to=${encodeURIComponent(req.headers.get('origin') || 'https://tyovnvuluyosjnabrzjc.supabase.co')}/auth`
            }
          });

          if (resetError) {
            console.error('Error sending password reset email:', resetError);
          } else {
            console.log('Sent password reset email');
          }
        } catch (emailError) {
          console.error('Error with password reset email:', emailError);
        }
      } else {
        console.log(`User already exists for: ${userData.email}`);
      }
    } else {
      // Just update the organization data without creating a user
      const { error: updateOrgError } = await supabaseAdmin
        .from('organizations')
        .update(reassignmentReq.new_organization_data)
        .eq('id', reassignmentReq.organization_id);

      if (updateOrgError) {
        console.error('Error updating organization:', updateOrgError);
        return new Response(
          JSON.stringify({ error: `Failed to update organization: ${updateOrgError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update the reassignment request status
    const { error: updateError } = await supabaseAdmin
      .from('organization_reassignment_requests')
      .update({
        status: 'approved',
        approved_by: adminUserId,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating reassignment request status:', updateError);
      // Don't return error here as user is already created
    }

    // Send approval email
    try {
      await supabaseAdmin.functions.invoke('organization-emails', {
        body: {
          type: 'reassignment_approval',
          to: reassignmentReq.new_contact_email,
          organizationName: reassignmentReq.new_organization_data?.name || 'Organization'
        }
      });
      console.log('Sent reassignment approval email');
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reassignment request approved successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});