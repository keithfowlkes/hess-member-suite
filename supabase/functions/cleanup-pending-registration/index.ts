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

    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cleaning up pending registration for email: ${email}`);

    // First check if there are any non-pending records to clean up
    const { data: existingData, error: checkError } = await supabaseAdmin
      .from('pending_registrations')
      .select('id, approval_status')
      .eq('email', email)
      .neq('approval_status', 'pending');

    if (checkError) {
      console.error('Error checking existing registrations:', checkError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing registrations: ${checkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let cleanedCount = 0;
    if (existingData && existingData.length > 0) {
      // Delete any non-pending records for this email to allow new registration
      const { data, error } = await supabaseAdmin
        .from('pending_registrations')
        .delete()
        .eq('email', email)
        .neq('approval_status', 'pending')
        .select('id, approval_status');

      if (error) {
        console.error('Error cleaning up registration:', error);
        return new Response(
          JSON.stringify({ error: `Failed to cleanup registration: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      cleanedCount = data?.length || 0;
    }

    console.log(`Successfully cleaned up ${cleanedCount} records for ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${cleanedCount} non-pending records for ${email}`,
        cleaned: cleanedCount
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