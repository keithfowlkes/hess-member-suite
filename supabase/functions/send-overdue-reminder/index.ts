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

    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('//', '//app.');
    
    const subject = `Payment Reminder - ${organizationName} Membership Fee Overdue`;
    
    const invoiceDetails = invoiceData ? `
      <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #dc2626; margin: 0 0 10px 0;">Outstanding Invoice Details</h3>
        <p><strong>Invoice Number:</strong> ${invoiceData.invoice_number}</p>
        <p><strong>Amount Due:</strong> $${invoiceData.amount.toLocaleString()}</p>
        <p><strong>Original Due Date:</strong> ${new Date(invoiceData.due_date).toLocaleDateString()}</p>
      </div>
    ` : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 2rem;">PAYMENT REMINDER</h1>
          <p style="color: #666; margin: 10px 0;">HESS Consortium Membership Fee</p>
        </div>
        
        <p>Dear ${organizationName} Team,</p>
        
        <p>This is a friendly reminder that your HESS Consortium membership fee is currently <strong style="color: #dc2626;">overdue</strong>.</p>
        
        ${invoiceDetails}
        
        <div style="background: #f9fafb; padding: 20px; border-left: 4px solid #dc2626; margin: 30px 0;">
          <h3 style="color: #dc2626; margin-bottom: 10px;">Immediate Action Required</h3>
          <p>To maintain your active membership status and avoid any service interruptions, please:</p>
          <ul>
            <li>Process your payment as soon as possible</li>
            <li>Contact us if you have any payment-related questions</li>
            <li>Update your membership information if needed</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" 
             style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Access Member Portal
          </a>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
          <h3 style="color: #374151; margin-bottom: 15px;">Need Help?</h3>
          <p>If you have questions about your membership or need assistance with payment, please don't hesitate to contact us:</p>
          <p>
            <strong>Email:</strong> billing@hessconsortium.org<br>
            <strong>Phone:</strong> [Contact Number]
          </p>
        </div>
        
        <div style="text-align: center; padding: 15px; background: #fef2f2; border-radius: 8px; margin-top: 30px;">
          <p style="color: #dc2626; margin: 0; font-weight: bold;">Thank you for your prompt attention to this matter.</p>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">HESS Consortium Team</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "HESS Consortium <billing@hessconsortium.org>",
      to: [to],
      subject,
      html,
    });

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