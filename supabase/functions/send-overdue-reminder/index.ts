import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OverdueReminderRequest {
  organizationName: string;
  to: string;
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
  console.log('Send overdue reminder function called');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationName, to, invoiceData }: OverdueReminderRequest = await req.json();
    console.log('Overdue reminder request:', { organizationName, to });

    // Get the overdue reminder template from system_messages
    const { data: messageTemplate, error: templateError } = await supabase
      .from('system_messages')
      .select('title, content')
      .eq('email_type', 'overdue_reminder')
      .eq('is_active', true)
      .maybeSingle();

    if (templateError || !messageTemplate) {
      console.error('Overdue reminder template not found:', templateError);
      throw new Error('Overdue reminder email template not found');
    }

    // Replace template variables
    const templateData = {
      organization_name: organizationName,
      invoice_number: invoiceData?.invoice_number || '',
      amount: invoiceData?.amount?.toLocaleString() || '',
      due_date: invoiceData ? new Date(invoiceData.due_date).toLocaleDateString() : ''
    };

    function replaceTemplateVariables(content: string, data: Record<string, string>): string {
      let result = content;
      Object.entries(data).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
      });
      return result;
    }

    const subject = replaceTemplateVariables(messageTemplate.title, templateData);
    
    // Migrate send-overdue-reminder to centralized method
    const emailData = {
      type: 'overdue_reminder',
      to: [to],
      subject: subject,
      data: {
        organization_name: organizationName,
        ...invoiceData
      }
    };

    const emailResponse = await supabase.functions.invoke('centralized-email-delivery-public', {
      body: emailData
    });

    if (emailResponse.error) {
      throw new Error(`Email delivery failed: ${emailResponse.error.message}`);
    }

    console.log("Overdue reminder sent successfully:", emailResponse);

    // Log the email action in audit log
    await supabase.from('audit_log').insert({
      action: 'overdue_reminder_sent',
      entity_type: 'email',
      details: { to, organizationName, invoiceData }
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-overdue-reminder function:", error);
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