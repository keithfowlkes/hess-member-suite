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

// Generate invoice HTML using the shared template that mirrors the on-screen
// Preview Invoice exactly (colors, layout, single-page sizing).
async function generateInvoiceHTML(_template: any, templateData: Record<string, string>, invoice: any, invoiceId: string, _embedded: boolean = false) {
  return buildInvoiceEmailHtml({
    invoiceNumber: templateData['{{INVOICE_NUMBER}}'],
    invoiceId,
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