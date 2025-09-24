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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { organizationName } = await req.json();

    console.log(`Fixing organization status for: ${organizationName}`);

    // Update the organization status to active
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        membership_status: 'active',
        membership_start_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('name', organizationName)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully updated organization ${organizationName} to active status`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Organization ${organizationName} status updated to active`,
        organization: updatedOrg
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fix-organization-status:', error);
    return new Response(
      JSON.stringify({ error: (error as any)?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});