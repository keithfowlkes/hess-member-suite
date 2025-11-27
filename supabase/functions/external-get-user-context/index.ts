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
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's JWT to verify their session
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user's session
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.log('Invalid or expired session:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id, user.email);

    // Parse the request body
    const { app_identifier, scopes = ['profile:read'] } = await req.json();

    if (!app_identifier) {
      return new Response(
        JSON.stringify({ success: false, error: 'app_identifier is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the external application is registered and active
    const { data: app, error: appError } = await supabaseAdmin
      .from('external_applications')
      .select('*')
      .eq('app_identifier', app_identifier)
      .eq('is_active', true)
      .single();

    if (appError || !app) {
      console.log('Application not found or inactive:', app_identifier, appError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Application not registered or inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found registered app:', app.name);

    // Validate requested scopes against allowed scopes
    const allowedScopes = app.allowed_scopes || [];
    const validScopes = scopes.filter((scope: string) => allowedScopes.includes(scope));
    
    if (validScopes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid scopes requested' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Valid scopes:', validScopes);

    // Build the response based on requested scopes
    const response: Record<string, any> = {
      success: true,
      authenticated: true,
      permissions: {
        can_edit: false,
        edit_url: 'https://hessmemberportal.lovable.app/profile'
      }
    };

    // Fetch user profile if profile:read scope is requested
    if (validScopes.includes('profile:read')) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, phone, primary_contact_title, organization')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        response.user = {
          id: user.id,
          profile_id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          title: profile.primary_contact_title,
          organization_name: profile.organization
        };
      }
      console.log('Profile fetched for user');
    }

    // Fetch organization data if organization:read scope is requested
    if (validScopes.includes('organization:read') || validScopes.includes('organization:systems')) {
      // First get the profile to find the organization
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, organization')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        // Find the organization where this profile is the contact person
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('contact_person_id', profile.id)
          .single();

        if (org) {
          const orgData: Record<string, any> = {
            id: org.id,
            name: org.name,
            city: org.city,
            state: org.state,
            membership_status: org.membership_status,
            student_fte: org.student_fte,
            website: org.website
          };

          // Add system fields if organization:systems scope is requested
          if (validScopes.includes('organization:systems')) {
            orgData.systems = {
              student_information_system: org.student_information_system,
              financial_system: org.financial_system,
              financial_aid: org.financial_aid,
              learning_management: org.learning_management,
              admissions_crm: org.admissions_crm,
              alumni_advancement_crm: org.alumni_advancement_crm,
              hcm_hr: org.hcm_hr,
              payroll_system: org.payroll_system,
              purchasing_system: org.purchasing_system,
              housing_management: org.housing_management,
              payment_platform: org.payment_platform,
              meal_plan_management: org.meal_plan_management,
              identity_management: org.identity_management,
              door_access: org.door_access,
              document_management: org.document_management,
              voip: org.voip,
              network_infrastructure: org.network_infrastructure
            };
          }

          response.organization = orgData;
          console.log('Organization fetched:', org.name);
        }
      }
    }

    // Fetch user roles if roles:read scope is requested
    if (validScopes.includes('roles:read')) {
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      response.roles = roles?.map(r => r.role) || ['member'];
      console.log('Roles fetched:', response.roles);
    }

    // Fetch user cohorts if cohorts:read scope is requested
    if (validScopes.includes('cohorts:read')) {
      const { data: cohorts } = await supabaseAdmin
        .from('user_cohorts')
        .select('cohort')
        .eq('user_id', user.id);

      response.cohorts = cohorts?.map(c => c.cohort) || [];
      console.log('Cohorts fetched:', response.cohorts);
    }

    // Log the access for audit purposes
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabaseAdmin
      .from('external_app_access_log')
      .insert({
        app_id: app.id,
        user_id: user.id,
        action: 'user_context_fetch',
        scopes_requested: validScopes,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    console.log('Access logged for app:', app.name, 'user:', user.email);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in external-get-user-context:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
