import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrganizationUpdateAlertRequest {
  organization_id: string;
  submitted_email: string;
  organization_name: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }

  try {
    console.log('[send-organization-update-alert] Starting organization update alert process');
    
    const { organization_id, submitted_email, organization_name }: OrganizationUpdateAlertRequest = await req.json();
    
    console.log('[send-organization-update-alert] Request data:', {
      organization_id,
      submitted_email,
      organization_name
    });

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "Organization ID is required" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get the current organization owner's email
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        contact_person_id,
        profiles!contact_person_id (
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', organization_id)
      .single();

    if (orgError || !organization) {
      console.error('[send-organization-update-alert] Error fetching organization:', orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    const profile = Array.isArray(organization.profiles) ? organization.profiles[0] : organization.profiles;
    const currentOwnerEmail = profile?.email;
    const currentOwnerName = profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : 'Organization Contact';

    if (!currentOwnerEmail) {
      console.error('[send-organization-update-alert] No contact person email found for organization');
      return new Response(
        JSON.stringify({ error: "No contact person email found for organization" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log('[send-organization-update-alert] Found current owner:', {
      email: currentOwnerEmail,
      name: currentOwnerName
    });

    // Don't send alert if the submitter is the same as the current owner
    if (currentOwnerEmail.toLowerCase() === submitted_email.toLowerCase()) {
      console.log('[send-organization-update-alert] Submitter is the current owner, skipping alert');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No alert sent - submitter is current owner" 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Prepare email data
    const emailData = {
      type: 'organization_update_alert',
      to: currentOwnerEmail,
      data: {
        user_name: currentOwnerName || 'Organization Contact',
        organization_name: organization_name || organization.name,
        submitted_email: submitted_email,
        contact_email: 'info@hessconsortium.org',
        deadline_hours: '24'
      }
    };

    console.log('[send-organization-update-alert] Calling centralized email delivery with data:', emailData);

    // Call the centralized email delivery function
    const emailResponse = await supabase.functions.invoke('centralized-email-delivery', {
      body: emailData
    });

    if (emailResponse.error) {
      console.error('[send-organization-update-alert] Error sending email:', emailResponse.error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send alert email", 
          details: emailResponse.error 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log('[send-organization-update-alert] Email sent successfully:', emailResponse.data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Organization update alert sent successfully",
        recipient: currentOwnerEmail
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('[send-organization-update-alert] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
};

serve(handler);