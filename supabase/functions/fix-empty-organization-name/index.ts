import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { organizationId, organizationName } = await req.json();

    if (!organizationId || !organizationName) {
      return new Response(
        JSON.stringify({ error: "Organization ID and name are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Fixing organization name for ID: ${organizationId} to: ${organizationName}`);

    // Update the organization name
    const { data: orgUpdate, error: orgError } = await supabase
      .from('organizations')
      .update({ name: organizationName })
      .eq('id', organizationId)
      .select()
      .single();

    if (orgError) {
      console.error('Failed to update organization:', orgError);
      return new Response(
        JSON.stringify({ error: `Failed to update organization: ${orgError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update the associated profile's organization field
    if (orgUpdate.contact_person_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization: organizationName })
        .eq('id', orgUpdate.contact_person_id);

      if (profileError) {
        console.error('Failed to update profile organization:', profileError);
        // Don't fail the whole process for this
      }
    }

    console.log('Organization name fixed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: "Organization name fixed successfully",
        organization: orgUpdate
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in fix-empty-organization-name function:", error);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);