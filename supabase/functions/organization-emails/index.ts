import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'invitation' | 'approval' | 'rejection' | 'transfer' | 'welcome' | 'member_approval' | 'overdue_reminder' | 'welcome_approved' | 'profile_update_approved' | 'analytics_feedback';
  to: string;
  organizationName?: string;
  token?: string;
  adminMessage?: string;
  memberName?: string;
  memberEmail?: string;
  secondaryEmail?: string;
  organizationData?: {
    primary_contact_name: string;
    secondary_first_name?: string;
    secondary_last_name?: string;
    secondary_contact_title?: string;
    secondary_contact_email?: string;
    primary_contact_title?: string;
    student_fte?: number;
    address_line_1?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
    website?: string;
    student_information_system?: string;
    financial_system?: string;
    financial_aid?: string;
    hcm_hr?: string;
    payroll_system?: string;
    purchasing_system?: string;
    housing_management?: string;
    learning_management?: string;
    admissions_crm?: string;
    alumni_advancement_crm?: string;
    primary_office_apple?: boolean;
    primary_office_asus?: boolean;
    primary_office_dell?: boolean;
    primary_office_hp?: boolean;
    primary_office_microsoft?: boolean;
    primary_office_other?: boolean;
    primary_office_other_details?: string;
    other_software_comments?: string;
  };
  transferDetails?: {
    currentContact: string;
    newContact: string;
  };
  invoiceData?: {
    invoice_number: string;
    amount: number;
    due_date: string;
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  console.log('Organization emails function called');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, organizationName, token, adminMessage, memberName, memberEmail, secondaryEmail, organizationData, transferDetails, invoiceData }: EmailRequest = await req.json();
    console.log('Email request:', { type, to, organizationName });

    // Use centralized email delivery system for supported types
    if (['welcome_approved', 'profile_update_approved', 'analytics_feedback'].includes(type)) {
      console.log(`Using centralized email delivery for type: ${type}`);
      
      let emailData: Record<string, any> = {};
      
      switch (type) {
        case 'welcome_approved':
          emailData = {
            organization_name: organizationName || 'Organization',
            primary_contact_name: organizationData?.primary_contact_name || 'Member',
            custom_message: adminMessage || 'We look forward to working with you and supporting your institution.'
          };
          break;

        case 'profile_update_approved':
          emailData = {
            organization_name: organizationName || 'Organization',
            primary_contact_name: organizationData?.primary_contact_name || 'Member',
            custom_message: adminMessage || 'Your profile changes have been successfully applied.'
          };
          break;

        case 'analytics_feedback':
          emailData = {
            member_name: memberName || 'Unknown',
            member_email: memberEmail || '',
            organization_name: organizationName || '',
            timestamp: new Date().toLocaleString(),
            feedback_message: adminMessage || ''
          };
          break;
      }

      const { data: emailResult, error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
        body: {
          type: type,
          to: [to],
          data: emailData
        }
      });

      if (emailError || emailResult?.error) {
        console.error(`❌ Failed to send ${type} email via centralized delivery:`, emailError || emailResult?.error);
        return new Response(
          JSON.stringify({ 
            error: `Failed to send ${type} email`,
            details: emailError?.message || emailResult?.error?.message 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`✅ ${type} email sent via centralized delivery:`, emailResult);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${type} email sent successfully`,
          emailId: emailResult?.emailId 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Legacy logic for unsupported email types (temporary fallback)
    console.log('Email type not yet migrated to centralized system:', type);
    return new Response(
      JSON.stringify({ 
        error: 'Email type not supported in centralized system yet', 
        type: type,
        message: 'This email type needs to be migrated to the centralized email delivery system'
      }),
      {
        status: 501,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in organization-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);