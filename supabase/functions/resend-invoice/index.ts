import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getEmailDesignSettings, replaceColorVariables } from '../_shared/email-design.ts';

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
  
  let invoiceHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4; color: {{text_color}}; font-size: 14px; background: white; padding: 2rem; max-width: 800px; margin: 0 auto;">
      <style>
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid {{primary_color}};
        }
        
        .logo-section img {
          max-height: 80px;
          width: auto;
        }
        
        .invoice-title {
          text-align: right;
        }
        
        .invoice-title h1 {
          font-size: 2rem;
          font-weight: bold;
          color: {{primary_color}};
          margin: 0;
          letter-spacing: 2px;
        }
        
        .invoice-number {
          font-size: 0.9rem;
          color: {{primary_color}};
          margin: 0.5rem 0 0 0;
        }
        
        .company-info {
          margin-bottom: 2rem;
          line-height: 1.3;
        }
        
        .company-info h3 {
          font-size: 1rem;
          font-weight: bold;
          margin: 0 0 0.25rem 0;
        }
        
        .company-info p {
          margin: 0.1rem 0;
          font-size: 0.9rem;
          color: {{text_color}}CC;
        }
        
        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          margin-bottom: 2rem;
        }
        
        .detail-section h3 {
          font-size: 1rem;
          font-weight: bold;
          color: {{text_color}};
          margin-bottom: 0.75rem;
        }
        
        .detail-section p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
        }
        
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
        }
        
        .invoice-table th {
          background: {{primary_color}};
          color: white;
          padding: 0.75rem;
          text-align: left;
          font-weight: bold;
          font-size: 0.9rem;
        }
        
        .invoice-table td {
          padding: 0.75rem;
        }
        
        .invoice-table .amount-cell {
          text-align: right;
          font-weight: normal;
        }
        
        .total-section {
          text-align: right;
          margin: 1rem 0;
          font-weight: bold;
          font-size: 1rem;
        }
        
        .notes-section {
          margin: 2rem 0;
        }
        
        .notes-section h3 {
          font-size: 1rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        
        .payment-info {
          background: #f8f9fa;
          padding: 1rem;
          border-left: 4px solid #6b7280;
          margin: 2rem 0;
        }
        
        .payment-info h3 {
          font-size: 1rem;
          font-weight: bold;
          color: #333;
          margin-bottom: 0.5rem;
        }
        
        .payment-info p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
        }
        
        .footer-section {
          text-align: center;
          margin-top: 3rem;
          padding-top: 2rem;
          font-size: 0.9rem;
          color: #666;
        }
        
        .footer-section p {
          margin: 0.25rem 0;
        }
      </style>
      
      <!-- Header with Logo and Invoice Title -->
      <div class="invoice-header">
        <div class="logo-section">
          <img src="https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png" alt="HESS Consortium Logo" style="width: 150px; height: auto;">
          <div class="company-info">
            <h3>HESS Consortium</h3>
            <p>Higher Education Systems & Services Consortium</p>
            <p>A consortium of private, non-profit colleges and universities</p>
          </div>
        </div>
        <div class="invoice-title">
          <h1>INVOICE</h1>
          <p class="invoice-number">Invoice #${templateData['{{INVOICE_NUMBER}}']}</p>
        </div>
      </div>
      
      <!-- Bill To and Invoice Details -->
      <div class="invoice-details">
        <div class="detail-section">
          <h3>Bill To:</h3>
          <p><strong>${invoice.organizationName}</strong></p>
          <p>Organization Address</p>
          ${invoice.organizationEmail ? `<p>${invoice.organizationEmail}</p>` : ''}
        </div>
        <div class="detail-section">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
          <p><strong>Period:</strong> ${periodStart} - ${periodEnd}</p>
        </div>
      </div>
      
      <!-- Invoice Items Table -->  
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
              ${invoice.proratedAmount ? '<div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">Prorated from membership start date</div>' : ''}
            </td>
            <td>
              ${periodStart} - ${periodEnd}
            </td>
            <td class="amount-cell">
              ${invoice.proratedAmount ? 
                `$${invoice.proratedAmount.toLocaleString()}` :
                `$${invoice.invoiceAmount.toLocaleString()}`
              }
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Total Due -->
      <div class="total-section">
        <p><strong>Total Due: $${(invoice.proratedAmount || invoice.invoiceAmount).toLocaleString()}</strong></p>
      </div>
      
      <!-- Notes -->
      ${invoice.notes ? `<div class="notes-section"><h3>Notes:</h3><p>${invoice.notes}</p></div>` : ''}
      
      <!-- Payment Information -->
      <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Payment Terms:</strong> Net 30 days</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
        <p>Please include invoice number ${templateData['{{INVOICE_NUMBER}}']} with your payment.</p>
      </div>
      
      <!-- Footer -->
      <div class="footer-section">
        <p>Questions about your invoice?</p>
        <p>Contact us at: billing@hessconsortium.org</p>
        <p>Visit us online: www.hessconsortium.org</p>
        <br />
        <p>Thank you for being a valued member of the HESS Consortium community!</p>
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
      '{{LOGO}}': '<img src="https://9f0afb12-d741-415b-9bbb-e40cfcba281a.lovableproject.com/assets/hess-logo.png" alt="HESS Consortium Logo" style="max-height: 80px; width: auto;">',
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

    const subject = messageTemplate?.title 
      ? messageTemplate.title.replace('{{organization_name}}', organization.name)
      : `HESS Consortium Membership Invoice - ${organization.name}`;

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