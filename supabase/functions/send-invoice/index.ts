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

// Template variable replacement function
function replaceTemplateVariables(content: string, data: Record<string, string>) {
  let result = content;
  Object.entries(data).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  return result;
}

// Generate full invoice HTML from template
function generateInvoiceHTML(template: any, templateData: Record<string, string>, invoice: any) {
  const headerHtml = replaceTemplateVariables(template.header_content, templateData);
  const footerHtml = replaceTemplateVariables(template.footer_content, templateData);
  
  const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString();
  const dueDate = new Date(invoice.due_date).toLocaleDateString();
  const periodStart = new Date(invoice.period_start_date).toLocaleDateString();
  const periodEnd = new Date(invoice.period_end_date).toLocaleDateString();
  
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; background: white; padding: 2rem;">
      <style>
        .header-content { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 3px solid #6b7280; }
        .logo-section img { max-height: 80px; width: auto; }
        .invoice-title h1 { font-size: 2.5rem; font-weight: bold; color: #6b7280; margin: 0; }
        .invoice-number { font-size: 1.1rem; color: #666; margin: 0.5rem 0 0 0; }
        .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
        .detail-section h3 { font-size: 1.1rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
        .invoice-table { width: 100%; border-collapse: collapse; margin: 2rem 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .invoice-table th { background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 1rem; text-align: left; font-weight: 600; }
        .invoice-table td { padding: 1rem; border-bottom: 1px solid #e5e7eb; }
        .invoice-table .amount-cell { text-align: right; font-weight: 600; }
        .total-row { background: #f8fafc; font-weight: bold; font-size: 1.1rem; }
        .footer-content { margin-top: 3rem; padding-top: 2rem; border-top: 2px solid #e5e7eb; }
        .payment-info { background: #f9fafb; padding: 1.5rem; border-left: 4px solid #6b7280; margin-bottom: 1rem; }
        .payment-info h3 { color: #6b7280; margin-bottom: 0.5rem; }
        .contact-info { text-align: center; padding: 1rem; background: #f8fafc; border-radius: 0.5rem; }
      </style>
      
      ${headerHtml}
      
      <div class="invoice-details">
        <div class="detail-section">
          <h3>Bill To:</h3>
          <p><strong>${invoice.organizationName}</strong></p>
          <p>${invoice.organizationEmail}</p>
        </div>
        <div class="detail-section">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
          <p><strong>Period:</strong> ${periodStart} - ${periodEnd}</p>
        </div>
      </div>
      
      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Period</th>
            <th class="amount-cell">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Annual Membership Fee</strong>
              ${invoice.proratedAmount ? '<div style="font-size: 0.9rem; color: #666; margin-top: 0.25rem;">Prorated from membership start date</div>' : ''}
            </td>
            <td>${periodStart} - ${periodEnd}</td>
            <td class="amount-cell">
              ${invoice.proratedAmount ? 
                `<div>$${invoice.proratedAmount.toLocaleString()}</div><div style="font-size: 0.9rem; color: #999; text-decoration: line-through;">$${invoice.invoiceAmount.toLocaleString()}</div>` :
                `$${invoice.invoiceAmount.toLocaleString()}`
              }
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2"><strong>Total Due:</strong></td>
            <td class="amount-cell"><strong>$${(invoice.proratedAmount || invoice.invoiceAmount).toLocaleString()}</strong></td>
          </tr>
        </tfoot>
      </table>
      
      ${invoice.notes ? `<div style="margin: 2rem 0;"><h3>Notes:</h3><p>${invoice.notes}</p></div>` : ''}
      
      ${footerHtml}
    </div>
  `;
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

    // Get default invoice template
    const { data: template, error: templateError } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('is_default', true)
      .single();

    if (templateError || !template) {
      console.error('Default template not found:', templateError);
      throw new Error('Default invoice template not found');
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

    // Prepare template data
    const templateData = {
      '{{LOGO}}': template.logo_url ? `<img src="${template.logo_url.startsWith('http') ? template.logo_url : `https://9f0afb12-d741-415b-9bbb-e40cfcba281a.sandbox.lovable.dev${template.logo_url}`}" alt="Logo" style="max-height: 80px;" />` : '',
      '{{INVOICE_NUMBER}}': invoiceNumber,
      '{{INVOICE_DATE}}': new Date().toLocaleDateString(),
      '{{DUE_DATE}}': dueDate.toLocaleDateString(),
      '{{ORGANIZATION_NAME}}': organizationName,
      '{{ORGANIZATION_EMAIL}}': organizationEmail,
      '{{AMOUNT}}': `$${invoiceAmount.toLocaleString()}`,
      '{{PRORATED_AMOUNT}}': finalAmount !== invoiceAmount ? `$${finalAmount.toLocaleString()}` : '',
      '{{PERIOD_START}}': new Date(periodStartDate).toLocaleDateString(),
      '{{PERIOD_END}}': new Date(periodEndDate).toLocaleDateString(),
      '{{PAYMENT_TERMS}}': '30',
      '{{CONTACT_EMAIL}}': 'billing@hessconsortium.org',
      '{{NOTES}}': notes || ''
    };

    // Generate HTML using template
    const html = generateInvoiceHTML(template, templateData, {
      organizationName,
      organizationEmail,
      invoiceAmount,
      proratedAmount: finalAmount !== invoiceAmount ? finalAmount : null,
      invoice_date: new Date().toISOString(),
      due_date: dueDate.toISOString(),
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
      notes
    });

    // Initialize Resend for sending email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const subject = `HESS Consortium Membership Invoice - ${organizationName}`;

    const emailResponse = await resend.emails.send({
      from: "HESS Consortium <onboarding@resend.dev>",
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