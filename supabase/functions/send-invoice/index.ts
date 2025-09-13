import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
function generateInvoiceHTML(template: any, templateData: Record<string, string>, invoice: any, embedded: boolean = false) {
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
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.4; color: #333; font-size: 14px; background: white; padding: 2rem; max-width: 800px; margin: 0 auto;">
      <style>
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #666;
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
          color: #666;
          margin: 0;
          letter-spacing: 2px;
        }
        
        .invoice-number {
          font-size: 0.9rem;
          color: #666;
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
          color: #555;
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
          color: #333;
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
          background: #6b7280;
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
          <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS Consortium Logo" style="width: 150px; height: auto;">
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
      '{{LOGO}}': '', // Not used in new design, logo is embedded directly
      '{{INVOICE_NUMBER}}': invoiceNumber,
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

    const subject = messageTemplate?.title 
      ? messageTemplate.title.replace('{{organization_name}}', organizationName)
      : `HESS Consortium Membership Invoice - ${organizationName}`;

    // Initialize Resend for sending email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const emailPayload: any = {
      from: Deno.env.get('RESEND_FROM') || 'HESS Consortium <onboarding@resend.dev>',
      to: [organizationEmail],
      subject: subject,
      html: html,
    };

    const emailResponse = await resend.emails.send(emailPayload);

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