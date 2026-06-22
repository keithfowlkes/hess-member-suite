import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getEmailDesignSettings, replaceColorVariables } from '../_shared/email-design.ts';
import { buildInvoiceEmailHtml } from '../_shared/invoice-html.ts';

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

// Generate full invoice HTML matching exact sample invoice design
async function generateInvoiceHTML(template: any, templateData: Record<string, string>, invoice: any, invoiceId: string, embedded: boolean = false) {
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
  const invoiceNumber = templateData['{{INVOICE_NUMBER}}'];
  const payLink = `https://members.hessconsortium.app/invoices?invoice=${invoiceId}`;

  let invoiceHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4; color: {{text_color}}; font-size: 14px; background: #ffffff; padding: 24px; max-width: 800px; margin: 0 auto;">
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

      <div style="text-align: right; margin: 16px 0; font-weight: bold; font-size: 16px;">
        <p style="margin: 0;"><strong>Total Due: ${totalDisplay}</strong></p>
      </div>

      ${invoice.notes ? `<div style="margin: 24px 0;"><h3 style="font-size: 16px; font-weight: bold; margin: 0 0 8px 0;">Notes:</h3><p style="margin: 0; font-size: 13px;">${invoice.notes}</p></div>` : ''}

      <div style="background: {{accent_color}}20; padding: 16px; border-left: 4px solid {{primary_color}}; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: bold; color: {{text_color}}; margin: 0 0 8px 0;">Payment Information</h3>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Payment Terms:</strong> Net 30 days</p>
        <p style="margin: 4px 0; font-size: 13px;"><strong>Due Date:</strong> ${dueDate}</p>
        <p style="margin: 4px 0; font-size: 13px;">Please include invoice number ${invoiceNumber} with your payment.</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #555;">
          The amount shown includes the Stripe credit-card processing fee. Pay-by-check remits the same amount.
        </p>
        <div style="text-align: center; margin: 20px 0 4px 0;">
          <a href="${payLink}" style="display: inline-block; background: {{primary_color}}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px;">
            Pay this invoice online
          </a>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Or copy this link: ${payLink}</p>
        </div>
      </div>

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
      '{{INVOICE_NUMBER}}': invoice.invoice_number,
      '{{INVOICE_DATE}}': formatDate(invoice.invoice_date),
      '{{DUE_DATE}}': formatDate(invoice.due_date),
      '{{ORGANIZATION_NAME}}': organization.name,
      '{{ORGANIZATION_ADDRESS}}': 'Organization Address',
      '{{ORGANIZATION_EMAIL}}': organization.email,
      '{{ORGANIZATION_PHONE}}': '',
      '{{AMOUNT}}': `$${invoice.amount.toLocaleString()}`,
      '{{PRORATED_AMOUNT}}': invoice.prorated_amount ? `$${invoice.prorated_amount.toLocaleString()}` : '',
      '{{PERIOD_START}}': formatDate(invoice.period_start_date),
      '{{PERIOD_END}}': formatDate(invoice.period_end_date),
      '{{PAYMENT_TERMS}}': '30',
      '{{CONTACT_EMAIL}}': 'billing@hessconsortium.org',
      '{{NOTES}}': invoice.notes || ''
    };

    // Get logo file as attachment
    let logoAttachment = null;
    if (template.logo_url) {
      try {
        const logoPath = template.logo_url.replace('/storage/v1/object/public/invoice-logos/', '');
        const { data: logoData, error: logoError } = await supabase.storage
          .from('invoice-logos')
          .download(logoPath);
        
        if (!logoError && logoData) {
          const logoBuffer = await logoData.arrayBuffer();
          logoAttachment = {
            filename: 'logo.png',
            content: Array.from(new Uint8Array(logoBuffer)),
            cid: 'logo'
          };
        }
      } catch (error) {
        console.log('Could not load logo for attachment:', error);
      }
    }

    // Generate HTML using template with embedded logo
    const html = await generateInvoiceHTML(template, templateData, {
      organizationName: organization.name,
      organizationEmail: organization.email,
      invoiceAmount: invoice.amount,
      proratedAmount: invoice.prorated_amount,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      period_start_date: invoice.period_start_date,
      period_end_date: invoice.period_end_date,
      notes: invoice.notes
    }, invoiceId, true); // true for embedded logo

    // Get invoice email template from system_messages for subject
    const { data: messageTemplate, error: messageError } = await supabase
      .from('system_messages')
      .select('title, content')
      .eq('email_type', 'invoice')
      .eq('is_active', true)
      .maybeSingle();

    const subject = 'HESS Consortium Membership Fee Invoice';

    // Migrate resend-invoice to centralized method
    const emailData = {
      type: 'invoice',
      to: [organization.email],
      subject: subject,
      data: {
        organization_name: organization.name || 'Unknown Organization',
        invoice_number: invoice.invoice_number || 'Unknown',
        amount: invoice.amount?.toString() || '0',
        due_date: invoice.due_date || 'Unknown',
        invoice_content: html
      }
    };

    const emailResponse = await supabase.functions.invoke('centralized-email-delivery-public', {
      body: emailData
    });

    if (emailResponse.error) {
      throw new Error(`Email delivery failed: ${emailResponse.error.message}`);
    }

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