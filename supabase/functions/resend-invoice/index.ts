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

    const organization = invoice.organizations;
    const finalAmount = invoice.prorated_amount || invoice.amount;

    // Prepare template data
    const templateData = {
      '{{LOGO}}': template.logo_url ? `<img src="${template.logo_url}" alt="Logo" style="max-height: 80px;" />` : '',
      '{{INVOICE_NUMBER}}': invoice.invoice_number,
      '{{INVOICE_DATE}}': new Date(invoice.invoice_date).toLocaleDateString(),
      '{{DUE_DATE}}': new Date(invoice.due_date).toLocaleDateString(),
      '{{ORGANIZATION_NAME}}': organization.name,
      '{{ORGANIZATION_EMAIL}}': organization.email,
      '{{AMOUNT}}': `$${invoice.amount.toLocaleString()}`,
      '{{PRORATED_AMOUNT}}': invoice.prorated_amount ? `$${invoice.prorated_amount.toLocaleString()}` : '',
      '{{PERIOD_START}}': new Date(invoice.period_start_date).toLocaleDateString(),
      '{{PERIOD_END}}': new Date(invoice.period_end_date).toLocaleDateString(),
      '{{PAYMENT_TERMS}}': '30',
      '{{CONTACT_EMAIL}}': 'billing@hessconsortium.org',
      '{{NOTES}}': invoice.notes || ''
    };

    // Generate HTML using template
    const html = generateInvoiceHTML(template, templateData, {
      organizationName: organization.name,
      organizationEmail: organization.email,
      invoiceAmount: invoice.amount,
      proratedAmount: invoice.prorated_amount,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      period_start_date: invoice.period_start_date,
      period_end_date: invoice.period_end_date,
      notes: invoice.notes
    });

    // Initialize Resend for sending email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const subject = `HESS Consortium Membership Invoice - ${organization.name}`;

    const emailResponse = await resend.emails.send({
      from: "HESS Consortium <onboarding@resend.dev>",
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