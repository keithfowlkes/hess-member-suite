import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getEmailDesignSettings, replaceColorVariables } from '../_shared/email-design.ts';
import { requireAdmin } from '../_shared/auth.ts';

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

// Generate full invoice HTML matching exact sample invoice design
async function generateInvoiceHTML(template: any, templateData: Record<string, string>, invoice: any, embedded: boolean = false) {
  // Get email design settings
  const designSettings = await getEmailDesignSettings();
  
  // Format dates exactly like ProfessionalInvoice component
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit' 
    });
  };
  
  const invoiceDate = formatDate(invoice.invoice_date);
  const dueDate = formatDate(invoice.due_date);
  const periodStart = formatDate(invoice.period_start_date);
  const periodEnd = formatDate(invoice.period_end_date);
  
  const amountDisplay = invoice.proratedAmount
    ? `$${Number(invoice.proratedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${Number(invoice.invoiceAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalDisplay = amountDisplay;
  const invoiceId = templateData['{{INVOICE_ID}}'];
  const invoiceNumber = templateData['{{INVOICE_NUMBER}}'];

  let invoiceHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4; color: {{text_color}}; font-size: 14px; background: #ffffff; padding: 24px; max-width: 800px; margin: 0 auto;">
      <!-- Header: logo/company info + INVOICE title (table for email-client compatibility) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid {{primary_color}};">
        <tr>
          <td style="vertical-align: top; width: 60%;">
            <img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS Consortium Logo" style="max-height: 80px; width: auto; display: block; margin-bottom: 12px;">
            <div style="line-height: 1.3;">
              <h3 style="font-size: 16px; font-weight: bold; margin: 0 0 4px 0;">HESS Consortium</h3>
              <p style="margin: 2px 0; font-size: 13px; color: {{text_color}}CC;">Higher Education Systems &amp; Services Consortium</p>
              <p style="margin: 2px 0; font-size: 13px; color: {{text_color}}CC;">A consortium of private, non-profit colleges and universities</p>
            </div>
          </td>
          <td style="vertical-align: top; text-align: right; width: 40%;">
            <h1 style="font-size: 32px; font-weight: bold; color: {{primary_color}}; margin: 0; letter-spacing: 2px;">INVOICE</h1>
            <p style="font-size: 13px; color: {{primary_color}}; margin: 8px 0 0 0;">Invoice #${invoiceNumber}</p>
          </td>
        </tr>
      </table>

      <!-- Bill To and Invoice Details (table layout for email clients) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="vertical-align: top; width: 50%; padding-right: 24px;">
            <h3 style="font-size: 16px; font-weight: bold; color: {{text_color}}; margin: 0 0 12px 0;">Bill To:</h3>
            <p style="margin: 4px 0; font-size: 13px;"><strong>${invoice.organizationName}</strong></p>
            ${invoice.organizationEmail ? `<p style="margin: 4px 0; font-size: 13px;">${invoice.organizationEmail}</p>` : ''}
          </td>
          <td style="vertical-align: top; width: 50%;">
            <h3 style="font-size: 16px; font-weight: bold; color: {{text_color}}; margin: 0 0 12px 0;">Invoice Details:</h3>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Invoice Date:</strong> ${invoiceDate}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Due Date:</strong> ${dueDate}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Period:</strong> ${periodStart} - ${periodEnd}</p>
          </td>
        </tr>
      </table>

      <!-- Line Items -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr>
            <th style="background: {{primary_color}}; color: #ffffff; padding: 12px; text-align: left; font-weight: bold; font-size: 13px;">Description</th>
            <th style="background: {{primary_color}}; color: #ffffff; padding: 12px; text-align: left; font-weight: bold; font-size: 13px;">Period</th>
            <th style="background: {{primary_color}}; color: #ffffff; padding: 12px; text-align: right; font-weight: bold; font-size: 13px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; vertical-align: top;">
              <strong>Annual Membership Fee</strong>
              <div style="font-size: 12px; color: {{text_color}}CC; margin-top: 4px;">includes Stripe Processing Fee</div>
              ${invoice.proratedAmount ? '<div style="font-size: 12px; color: {{text_color}}CC; margin-top: 4px;">Prorated from membership start date</div>' : ''}
            </td>
            <td style="padding: 12px; vertical-align: top;">${periodStart} - ${periodEnd}</td>
            <td style="padding: 12px; vertical-align: top; text-align: right;">${amountDisplay}</td>
          </tr>
        </tbody>
      </table>

      <!-- Total Due -->
      <div style="text-align: right; margin: 16px 0; font-weight: bold; font-size: 16px;">
        <p style="margin: 0;"><strong>Total Due: ${totalDisplay}</strong></p>
      </div>

      ${invoice.notes ? `<div style="margin: 24px 0;"><h3 style="font-size: 16px; font-weight: bold; margin: 0 0 8px 0;">Notes:</h3><p style="margin: 0; font-size: 13px;">${invoice.notes}</p></div>` : ''}

      <!-- Payment Information -->
      <div style="background: {{accent_color}}20; padding: 16px; border-left: 4px solid {{primary_color}}; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: bold; color: {{text_color}}; margin: 0 0 8px 0;">Payment Information</h3>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Payment Terms:</strong> Net 30 days</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Due Date:</strong> ${dueDate}</p>
        <p style="margin: 4px 0; font-size: 13px;">Please include invoice number ${invoiceNumber} with your payment.</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #555;">
          The amount shown includes the Stripe credit-card processing fee. Pay-by-check remits the same amount.
        </p>
        ${invoiceId ? `
        <div style="text-align: center; margin: 20px 0 4px 0;">
          <a href="https://members.hessconsortium.app/invoices?invoice=${invoiceId}"
             style="display: inline-block; background: {{primary_color}}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px;">
            Pay this invoice online
          </a>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">
            Or copy this link: https://members.hessconsortium.app/invoices?invoice=${invoiceId}
          </p>
        </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; padding-top: 24px; font-size: 13px; color: {{text_color}}CC;">
        <p style="margin: 4px 0;">Questions about your invoice?</p>
        <p style="margin: 4px 0;">Contact us at: billing@hessconsortium.org</p>
        <p style="margin: 4px 0;">Visit us online: www.hessconsortium.org</p>
        <p style="margin: 16px 0 4px 0;">Thank you for being a valued member of the HESS Consortium community!</p>
      </div>
    </div>
  `;
  
  // Replace color variables with actual design settings
  invoiceHtml = replaceColorVariables(invoiceHtml, designSettings);
  
  return invoiceHtml;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated admin caller (JWT-based)
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;
    const callerAuthHeader = req.headers.get('Authorization') ?? '';

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
    
    // Get design settings for color replacement
    const designSettings = await getEmailDesignSettings();
    
    if (membershipStartDate && !proratedAmount) {
      const membershipStart = new Date(membershipStartDate);
      const periodStart = new Date(periodStartDate);
      const periodEnd = new Date(periodEndDate);
      
      if (membershipStart > periodStart) {
        const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.ceil((periodEnd.getTime() - membershipStart.getTime()) / (1000 * 60 * 60 * 24));
        finalAmount = Math.round((invoiceAmount * remainingDays / totalDays) * 100) / 100;
        let proratedTemplate = `
          <div style="background: {{accent_color}}20; border: 1px solid {{accent_color}}; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: {{primary_color}}; margin: 0 0 10px 0;">Prorated Membership Fee</h3>
            <p>Since your membership started on ${membershipStart.toLocaleDateString()}, your fee has been prorated:</p>
            <p><strong>Full Annual Fee:</strong> $${invoiceAmount.toLocaleString()}</p>
            <p><strong>Prorated Amount:</strong> $${finalAmount.toLocaleString()} (${remainingDays} of ${totalDays} days)</p>
            <p><strong>Period:</strong> ${membershipStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}</p>
          </div>
        `;
        proratedInfo = replaceColorVariables(proratedTemplate, designSettings);
      }
    } else if (proratedAmount) {
      finalAmount = proratedAmount;
      let proratedTemplate = `
        <div style="background: {{accent_color}}20; border: 1px solid {{accent_color}}; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: {{primary_color}}; margin: 0 0 10px 0;">Prorated Membership Fee</h3>
          <p><strong>Full Annual Fee:</strong> $${invoiceAmount.toLocaleString()}</p>
          <p><strong>Prorated Amount:</strong> $${finalAmount.toLocaleString()}</p>
          <p><strong>Period:</strong> ${new Date(periodStartDate).toLocaleDateString()} - ${new Date(periodEndDate).toLocaleDateString()}</p>
        </div>
      `;
      proratedInfo = replaceColorVariables(proratedTemplate, designSettings);
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

    // Prepare template data with tracking logo URL and exact date formatting
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit' 
      });
    };
    
    const templateData = {
      '{{LOGO}}': '<img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS Consortium Logo" style="max-height: 80px; width: auto;">',
      '{{INVOICE_NUMBER}}': invoiceNumber,
      '{{INVOICE_ID}}': invoice.id,
      '{{INVOICE_DATE}}': formatDate(new Date().toISOString()),
      '{{DUE_DATE}}': formatDate(dueDate.toISOString()),
      '{{ORGANIZATION_NAME}}': organizationName,
      '{{ORGANIZATION_ADDRESS}}': 'Organization Address',
      '{{ORGANIZATION_EMAIL}}': organizationEmail,
      '{{ORGANIZATION_PHONE}}': '',
      '{{AMOUNT}}': `$${invoiceAmount.toLocaleString()}`,
      '{{PRORATED_AMOUNT}}': finalAmount !== invoiceAmount ? `$${finalAmount.toLocaleString()}` : '',
      '{{PERIOD_START}}': formatDate(periodStartDate),
      '{{PERIOD_END}}': formatDate(periodEndDate),
      '{{PAYMENT_TERMS}}': '30',
      '{{CONTACT_EMAIL}}': 'billing@hessconsortium.org',
      '{{NOTES}}': notes || ''
    };

    // Generate HTML using template with directly embedded logo
    const html = await generateInvoiceHTML(template, templateData, {
      organizationName,
      organizationEmail,
      invoiceAmount,
      proratedAmount: finalAmount !== invoiceAmount ? finalAmount : null,
      invoice_date: new Date().toISOString(),
      due_date: dueDate.toISOString(),
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
      notes: notes ? `${notes}${proratedInfo}` : proratedInfo
    }, false); // false - no need for attachment, logo is directly embedded

    // Get invoice email template from system_messages
    const { data: messageTemplate, error: messageError } = await supabase
      .from('system_messages')
      .select('title, content')
      .eq('email_type', 'invoice')
      .eq('is_active', true)
      .maybeSingle();

    if (messageError || !messageTemplate) {
      console.error('Invoice email template not found:', messageError);
      // Fall back to simple subject if template not found
    }

    const subject = 'HESS Consortium Membership Fee Invoice';

    // Initialize Resend for sending email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Migrate send-invoice to centralized method
    const emailData = {
      type: 'invoice',
      to: [organizationEmail],
      subject: subject,
      data: {
        organization_name: organizationName,
        invoice_number: invoiceNumber,
        amount: finalAmount.toString(),
        due_date: dueDate.toLocaleDateString(),
        invoice_content: html
      }
    };

    const emailResponse = await supabase.functions.invoke('centralized-email-delivery-public', {
      body: emailData
    });

    if (emailResponse.error) {
      throw new Error(`Email delivery failed: ${emailResponse.error.message}`);
    }

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
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        type: error.constructor.name
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});