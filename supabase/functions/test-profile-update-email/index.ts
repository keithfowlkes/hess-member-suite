import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    console.log('Test profile update email function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the HigherEdCommunities.org organization data for testing
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .select('*, profiles!organizations_contact_person_id_fkey(*)')
      .eq('name', 'HigherEdCommunities.org')
      .single();

    if (orgError) {
      console.error('Error fetching organization data:', orgError);
      throw new Error(`Failed to fetch organization: ${orgError.message}`);
    }

    if (!orgData) {
      throw new Error('HigherEdCommunities.org organization not found');
    }

    console.log('Found organization:', orgData.name);
    
    const profile = orgData.profiles;
    const organizationData = {
      primary_contact_name: `${profile.first_name} ${profile.last_name}`,
      primary_contact_title: profile.primary_contact_title || orgData.primary_contact_title || '',
      secondary_first_name: profile.secondary_first_name || orgData.secondary_first_name || '',
      secondary_last_name: profile.secondary_last_name || orgData.secondary_last_name || '',
      secondary_contact_title: profile.secondary_contact_title || orgData.secondary_contact_title || '',
      secondary_contact_email: profile.secondary_contact_email || orgData.secondary_contact_email || '',
      student_fte: profile.student_fte || orgData.student_fte,
      address_line_1: orgData.address_line_1 || '',
      city: orgData.city || '',
      state: orgData.state || '',
      zip_code: orgData.zip_code || '',
      phone: orgData.phone || '',
      email: orgData.email || profile.email,
      website: orgData.website || '',
      student_information_system: orgData.student_information_system || '',
      financial_system: orgData.financial_system || '',
      financial_aid: orgData.financial_aid || '',
      hcm_hr: orgData.hcm_hr || '',
      payroll_system: orgData.payroll_system || '',
      purchasing_system: orgData.purchasing_system || '',
      housing_management: orgData.housing_management || '',
      learning_management: orgData.learning_management || '',
      admissions_crm: orgData.admissions_crm || '',
      alumni_advancement_crm: orgData.alumni_advancement_crm || '',
      primary_office_apple: orgData.primary_office_apple || false,
      primary_office_asus: orgData.primary_office_asus || false,
      primary_office_dell: orgData.primary_office_dell || false,
      primary_office_hp: orgData.primary_office_hp || false,
      primary_office_microsoft: orgData.primary_office_microsoft || false,
      primary_office_other: orgData.primary_office_other || false,
      primary_office_other_details: orgData.primary_office_other_details || '',
      other_software_comments: orgData.other_software_comments || '',
    };

    console.log('Sending test email to:', profile.email);

    // Send the test profile update approval email
    const { data: emailResult, error: emailError } = await supabaseClient.functions.invoke('centralized-email-delivery', {
      body: {
        type: 'profile_update_message_template',
        to: profile.email,
        subject: `TEST - HESS Consortium - Profile Update Approved for ${orgData.name}`,
        data: {
          organization_name: orgData.name,
          secondary_email: organizationData.secondary_contact_email,
          admin_notes: 'This is a test email to verify the profile update confirmation system is working correctly.',
          ...organizationData
        }
      }
    });

    if (emailError) {
      console.error('Error sending test email:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log('Test email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test profile update confirmation email sent to ${profile.email}`,
        organization: orgData.name,
        emailResult
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in test-profile-update-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});