import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendInvoiceRequest {
  invoiceId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId }: ResendInvoiceRequest = await req.json();

    console.log('Resend invoice request:', { invoiceId });

    // Initialize Supabase client with service role key for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get invoice details with organization info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        organizations (
          id,
          name,
          email
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError);
      throw new Error(`Invoice not found: ${invoiceError?.message}`);
    }

    if (!invoice.organizations) {
      throw new Error('Organization information not found for invoice');
    }

    const organization = invoice.organizations;
    const finalAmount = invoice.prorated_amount || invoice.amount;

    // Initialize Resend for sending email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const subject = `HESS Consortium Membership Invoice - ${organization.name}`;
    
    // Determine if this is a prorated invoice
    let proratedInfo = '';
    if (invoice.prorated_amount && invoice.prorated_amount !== invoice.amount) {
      proratedInfo = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin: 0 0 10px 0;">Prorated Membership Fee</h3>
          <p><strong>Full Annual Fee:</strong> $${invoice.amount.toLocaleString()}</p>
          <p><strong>Prorated Amount:</strong> $${invoice.prorated_amount.toLocaleString()}</p>
          <p><strong>Period:</strong> ${new Date(invoice.period_start_date).toLocaleDateString()} - ${new Date(invoice.period_end_date).toLocaleDateString()}</p>
        </div>
      `;
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">HESS Consortium</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Membership Invoice</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Dear ${organization.name} Team,</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
            This is a resend of your HESS Consortium membership invoice. Please find the details below.
          </p>

          ${proratedInfo}
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">Invoice Details</h3>
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">Invoice Number:</span>
                <span style="color: #1f2937; font-weight: 600;">${invoice.invoice_number}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">Invoice Date:</span>
                <span style="color: #1f2937;">${new Date(invoice.invoice_date).toLocaleDateString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">Due Date:</span>
                <span style="color: #1f2937;">${new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 2px solid #0ea5e9;">
                <span style="color: #6b7280; font-weight: 500;">Amount Due:</span>
                <span style="color: #0ea5e9; font-weight: bold; font-size: 18px;">$${finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #065f46; margin: 0 0 10px 0;">Payment Instructions</h3>
            <p style="color: #065f46; margin: 0; line-height: 1.5;">
              Please remit payment within 30 days of the invoice date. For questions about this invoice or payment methods, 
              please contact our billing department.
            </p>
          </div>

          ${invoice.notes ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0;">Additional Notes</h3>
              <p style="color: #92400e; margin: 0; line-height: 1.5;">${invoice.notes}</p>
            </div>
          ` : ''}

          <div style="margin-top: 40px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Thank you for your membership in the HESS Consortium!
            </p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            HESS Consortium | Higher Education Support Services<br>
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "HESS Consortium <billing@hessconsortium.app>",
      to: [organization.email],
      subject: subject,
      html: html,
    });

    console.log("Invoice email resent successfully:", emailResponse);

    // Update the invoice sent_date to track the resend
    await supabase
      .from('invoices')
      .update({
        sent_date: new Date().toISOString()
      })
      .eq('id', invoiceId);

    // Log the action in audit log
    await supabase.from('audit_log').insert({
      action: 'invoice_resent',
      entity_type: 'invoice',
      entity_id: invoiceId,
      details: { 
        organizationId: organization.id,
        organizationName: organization.name, 
        invoiceNumber: invoice.invoice_number,
        amount: finalAmount
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      invoiceId: invoiceId,
      invoiceNumber: invoice.invoice_number,
      amount: finalAmount
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in resend-invoice function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});