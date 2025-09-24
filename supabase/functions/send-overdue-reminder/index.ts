import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
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

    // Use centralized email delivery system
    const emailData = {
      type: 'overdue_reminder',
      to: [to],
      subject: 'Overdue Invoice Reminder',
      data: {
        organization_name: organizationName,
        invoice_number: invoiceData?.invoice_number || '',
        amount: invoiceData?.amount?.toLocaleString() || '',
        due_date: invoiceData ? new Date(invoiceData.due_date).toLocaleDateString() : ''
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