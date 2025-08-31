import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  organizationId: string;
  organizationName: string;
  organizationEmail: string;
  membershipStartDate: string;
  proratedAmount?: number;
  invoiceAmount: number;
  periodStartDate: string;
  periodEndDate: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      organizationId,
      organizationName,
      organizationEmail,
      membershipStartDate,
      proratedAmount,
      invoiceAmount,
      periodStartDate,
      periodEndDate,
      notes
    }: SendInvoiceRequest = await req.json();

    console.log('Send invoice request:', { organizationId, organizationName, organizationEmail });

    // Initialize Supabase client with service role key for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Calculate prorated amount if not provided
    let finalAmount = invoiceAmount;
    let proratedInfo = '';
    
    if (membershipStartDate && !proratedAmount) {
      const membershipStart = new Date(membershipStartDate);
      const periodStart = new Date(periodStartDate);
      const periodEnd = new Date(periodEndDate);
      
      if (membershipStart > periodStart) {
        const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.ceil((periodEnd.getTime() - membershipStart.getTime()) / (1000 * 60 * 60 * 24));
        finalAmount = Math.round((invoiceAmount * remainingDays / totalDays) * 100) / 100;
        proratedInfo = `
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0369a1; margin: 0 0 10px 0;">Prorated Membership Fee</h3>
            <p>Since your membership started on ${membershipStart.toLocaleDateString()}, your fee has been prorated:</p>
            <p><strong>Full Annual Fee:</strong> $${invoiceAmount.toLocaleString()}</p>
            <p><strong>Prorated Amount:</strong> $${finalAmount.toLocaleString()} (${remainingDays} of ${totalDays} days)</p>
            <p><strong>Period:</strong> ${membershipStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}</p>
          </div>
        `;
      }
    } else if (proratedAmount) {
      finalAmount = proratedAmount;
      proratedInfo = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin: 0 0 10px 0;">Prorated Membership Fee</h3>
          <p><strong>Full Annual Fee:</strong> $${invoiceAmount.toLocaleString()}</p>
          <p><strong>Prorated Amount:</strong> $${finalAmount.toLocaleString()}</p>
          <p><strong>Period:</strong> ${new Date(periodStartDate).toLocaleDateString()} - ${new Date(periodEndDate).toLocaleDateString()}</p>
        </div>
      `;
    }

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, email')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('Organization not found:', orgError);
      throw new Error(`Organization not found: ${orgError.message}`);
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${organizationId.slice(-6)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

    // Create invoice record in database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        invoice_number: invoiceNumber,
        amount: invoiceAmount,
        prorated_amount: finalAmount !== invoiceAmount ? finalAmount : null,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        period_start_date: periodStartDate,
        period_end_date: periodEndDate,
        status: 'sent',
        sent_date: new Date().toISOString(),
        notes: notes || 'Invoice generated during registration approval'
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Initialize Resend for sending email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const subject = `HESS Consortium Membership Invoice - ${organizationName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">HESS Consortium</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Membership Invoice</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Dear ${organizationName} Team,</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
            Welcome to the HESS Consortium! We're pleased to provide your membership invoice for the upcoming period.
          </p>

          ${proratedInfo}
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">Invoice Details</h3>
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">Invoice Number:</span>
                <span style="color: #1f2937; font-weight: 600;">${invoiceNumber}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">Invoice Date:</span>
                <span style="color: #1f2937;">${new Date().toLocaleDateString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-weight: 500;">Due Date:</span>
                <span style="color: #1f2937;">${dueDate.toLocaleDateString()}</span>
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

          ${notes ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0;">Additional Notes</h3>
              <p style="color: #92400e; margin: 0; line-height: 1.5;">${notes}</p>
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
      to: [organizationEmail],
      subject: subject,
      html: html,
    });

    console.log("Invoice email sent successfully:", emailResponse);

    // Log the action in audit log
    await supabase.from('audit_log').insert({
      action: 'invoice_sent',
      entity_type: 'invoice',
      entity_id: invoice.id,
      details: { 
        organizationId,
        organizationName, 
        invoiceNumber,
        amount: finalAmount,
        prorated: finalAmount !== invoiceAmount
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      invoiceId: invoice.id,
      invoiceNumber,
      amount: finalAmount
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-invoice function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});