import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getEmailDesignSettings, replaceColorVariables } from '../_shared/email-design.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { buildInvoiceEmailHtml } from '../_shared/invoice-html.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CURRENT_INVOICE_PERIOD_START = "2026-07-30";

function currentInvoicePeriod(termStartRaw?: string | null) {
  const start = String(termStartRaw || CURRENT_INVOICE_PERIOD_START).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const startDate = start
    ? new Date(Date.UTC(Number(start[1]), Number(start[2]) - 1, Number(start[3])))
    : new Date(Date.UTC(2026, 6, 30));
  const endDate = new Date(startDate);
  endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
}

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

// Generate invoice HTML using the shared template that mirrors the on-screen
// Preview Invoice exactly (colors, layout, single-page sizing).
async function generateInvoiceHTML(_template: any, templateData: Record<string, string>, invoice: any, _embedded: boolean = false) {
  return buildInvoiceEmailHtml({
    invoiceNumber: templateData['{{INVOICE_NUMBER}}'],
    invoiceId: templateData['{{INVOICE_ID}}'] || null,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    periodStart: invoice.period_start_date,
    periodEnd: invoice.period_end_date,
    organizationName: invoice.organizationName,
    organizationEmail: invoice.organizationEmail,
    amount: Number(invoice.invoiceAmount) || 0,
    proratedAmount: invoice.proratedAmount ? Number(invoice.proratedAmount) : null,
    notes: invoice.notes || null,
  });
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
      periodStartDate: requestedPeriodStartDate,
      periodEndDate: requestedPeriodEndDate,
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
    const { data: termSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'default_term_end_date')
      .maybeSingle();
    const invoicePeriod = currentInvoicePeriod(termSetting?.setting_value);
    const periodStartDate = invoicePeriod.start || requestedPeriodStartDate;
    const periodEndDate = invoicePeriod.end || requestedPeriodEndDate;
    
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