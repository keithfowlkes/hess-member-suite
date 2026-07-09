import { format } from 'date-fns';
import hessW9Asset from '@/assets/HESS_W9.pdf.asset.json';
import { useMemo } from 'react';
import { useInvoiceTemplates } from '@/hooks/useInvoiceTemplates';
import { Invoice } from '@/hooks/useInvoices';
import { formatCurrency } from '@/lib/utils';
import { useConferenceRegistrationCode } from '@/hooks/useConferenceRegistrationCode';
import { useSystemSetting } from '@/hooks/useSystemSettings';

interface ProfessionalInvoiceProps {
  invoice: Invoice;
  template?: any;
  /**
   * Optional override for the conference registration code block. When omitted,
   * the component looks up the organization's issued code automatically. Pass a
   * non-empty string (e.g. a placeholder) to force the block to render.
   */
  registrationCode?: string | null;
  /**
   * When 'ach', the on-screen invoice subtracts the configured Stripe fee from
   * the displayed amounts, removes the "includes Stripe Processing Fee" line,
   * and shows an "ACH / Check version" badge. The stored invoice is unchanged.
   */
  paymentMode?: 'card' | 'ach';
}

export function ProfessionalInvoice({ invoice: rawInvoice, template, registrationCode, paymentMode = 'card' }: ProfessionalInvoiceProps) {
  const { getDefaultTemplate } = useInvoiceTemplates();
  const { data: termEndSetting } = useSystemSetting('default_term_end_date');
  const { data: stripeFeeSetting } = useSystemSetting('stripe_processing_fee');
  const stripeFee = Math.max(0, parseFloat(stripeFeeSetting?.setting_value || '9.27') || 0);
  const isAch = paymentMode === 'ach';
  const adjust = (n: number | null | undefined) =>
    n == null ? n : Math.max(0, Number(n) - (isAch ? stripeFee : 0));


  // For non-paid invoices, override the displayed period to reflect the
  // currently configured term end date (one-year window ending on that date).
  // Paid invoices keep their stored historical period.
  const invoice = useMemo(() => {
    if (!rawInvoice) return rawInvoice;
    if (rawInvoice.status === 'paid') return rawInvoice;
    const termEndRaw = termEndSetting?.setting_value;
    if (!termEndRaw) return rawInvoice;
    const match = String(termEndRaw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return rawInvoice;
    const endYear = parseInt(match[1], 10);
    const monthDay = `${match[2]}-${match[3]}`;
    return {
      ...rawInvoice,
      period_start_date: `${endYear - 1}-${monthDay}`,
      period_end_date: `${endYear}-${monthDay}`,
    };
  }, [rawInvoice, termEndSetting?.setting_value]);

  const fallbackTemplate = {
    id: 'fallback',
    name: 'Default Template',
    logo_url: undefined,
    header_content: '',
    footer_content: '',
    custom_styles: {},
    is_default: true,
    created_at: '',
    updated_at: ''
  };
  const activeTemplate = template || getDefaultTemplate() || fallbackTemplate;

  const templateData = {
    '{{LOGO}}': activeTemplate.logo_url ? `<img src="${activeTemplate.logo_url}" alt="Logo" style="max-height: 80px;" />` : '',
    '{{INVOICE_NUMBER}}': invoice.invoice_number,
    '{{INVOICE_DATE}}': format(new Date(invoice.invoice_date), 'MMM dd, yyyy'),
    '{{DUE_DATE}}': format(new Date(invoice.due_date), 'MMM dd, yyyy'),
    '{{ORGANIZATION_NAME}}': invoice.organizations?.name || '',
    '{{ORGANIZATION_ADDRESS}}': getOrganizationAddress(invoice),
    '{{ORGANIZATION_EMAIL}}': invoice.organizations?.email || '',
    '{{ORGANIZATION_PHONE}}': '', // Add phone field to organizations if needed
    '{{AMOUNT}}': formatCurrency(invoice.amount),
    '{{PRORATED_AMOUNT}}': invoice.prorated_amount ? formatCurrency(invoice.prorated_amount) : '',
    '{{PERIOD_START}}': format(new Date(invoice.period_start_date), 'MMM dd, yyyy'),
    '{{PERIOD_END}}': format(new Date(invoice.period_end_date), 'MMM dd, yyyy'),
    '{{PAYMENT_TERMS}}': '30',
    '{{CONTACT_EMAIL}}': 'billing@hessconsortium.org',
    '{{NOTES}}': invoice.notes || ''
  };

  function getOrganizationAddress(invoice: Invoice) {
    const org = invoice.organizations;
    if (!org) return '';
    
    // Note: Organization address fields would need to be added to the organizations table
    return 'Organization Address';
  }

  function replaceTemplateVariables(content: string, data: Record<string, string>) {
    let result = content;
    Object.entries(data).forEach(([placeholder, value]) => {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    return result;
  }

  const headerHtml = replaceTemplateVariables(activeTemplate.header_content, templateData);
  const footerHtml = replaceTemplateVariables(activeTemplate.footer_content, templateData);

  const isPaid = invoice.status === 'paid';

  return (
    <div className="invoice-container bg-white p-8 max-w-4xl mx-auto relative">
      {/* Custom Styles matching HESS sample invoice */}
      <style>
        {`
          .invoice-container {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            font-size: 14px;
          }
          
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
        `}
      </style>

      {isPaid && (
        <div
          aria-label="Paid"
          style={{
            position: 'absolute',
            top: '180px',
            right: '60px',
            transform: 'rotate(-18deg)',
            border: '6px solid #16a34a',
            color: '#16a34a',
            padding: '8px 24px',
            fontSize: '3rem',
            fontWeight: 900,
            letterSpacing: '6px',
            borderRadius: '8px',
            opacity: 0.85,
            pointerEvents: 'none',
            textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.6)',
            zIndex: 10,
          }}
        >
          Paid
          {invoice.paid_date && (
            <div style={{ fontSize: '0.75rem', letterSpacing: '1px', fontWeight: 600, textAlign: 'center', marginTop: '4px' }}>
              {format(new Date(invoice.paid_date), 'MMM dd, yyyy')}
            </div>
          )}
        </div>
      )}

      {/* Header with Logo and Invoice Title */}
      <div className="invoice-header">
        <div className="logo-section">
          {activeTemplate.logo_url && (
            <img src={activeTemplate.logo_url} alt="Company Logo" />
          )}
          <div className="company-info">
            <h3>HESS Consortium</h3>
            <p>Higher Education Systems & Services Consortium</p>
            <p>A consortium of private, non-profit colleges and universities</p>
          </div>
        </div>
        <div className="invoice-title">
          <h1>INVOICE</h1>
          <p className="invoice-number">Invoice #{invoice.invoice_number}</p>
          {isAch && (
            <p style={{ marginTop: '0.4rem', display: 'inline-block', padding: '2px 8px', background: '#f0fdf4', color: '#166534', border: '1px solid #16a34a', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.03em' }}>
              ACH / CHECK VERSION
            </p>
          )}
        </div>

      </div>

      {/* Bill To and Invoice Details */}
      <div className="invoice-details">
        <div className="detail-section">
          <h3>Bill To:</h3>
          <p><strong>{invoice.organizations?.name}</strong></p>
          <p>Organization Address</p>
          {invoice.organizations?.email && <p>{invoice.organizations.email}</p>}
        </div>
        <div className="detail-section">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice Date:</strong> {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</p>
          <p><strong>Due Date:</strong> {format(new Date(invoice.due_date), 'MMM dd, yyyy')}</p>
          <p><strong>Period:</strong> {format(new Date(invoice.period_start_date), 'MMM dd, yyyy')} - {format(new Date(invoice.period_end_date), 'MMM dd, yyyy')}</p>
        </div>
      </div>

      {/* Invoice Items Table */}
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Period</th>
            <th className="amount-cell">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Annual Membership Fee</strong>
              <div style={{ fontSize: '0.8rem', color: isAch ? '#166534' : '#666', marginTop: '0.25rem', fontWeight: isAch ? 600 : 'normal' }}>
                {isAch ? 'ACH / Check payment — no processing fee' : 'includes Stripe Processing Fee'}
              </div>
              {invoice.prorated_amount && (
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  Prorated from membership start date
                </div>
              )}
            </td>
            <td>
              {format(new Date(invoice.period_start_date), 'MMM dd, yyyy')} - {format(new Date(invoice.period_end_date), 'MMM dd, yyyy')}
            </td>
            <td className="amount-cell">
              {invoice.prorated_amount ? (
                <>
                  <div>{formatCurrency(adjust(invoice.prorated_amount) as number)}</div>
                </>
              ) : (
                formatCurrency(adjust(invoice.amount) as number)
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Total Due */}
      <div className="total-section">
        <p><strong>Total Due: {formatCurrency(adjust(invoice.prorated_amount || invoice.amount) as number)}</strong></p>
      </div>


      {/* Notes */}
      {invoice.notes && (
        <div className="notes-section">
          <h3>Notes:</h3>
          <p>{invoice.notes}</p>
        </div>
      )}

      {/* Conference registration code (shown when issued for this org, or when an override is provided for previews) */}
      <ConferenceRegistrationCodeBlock
        organizationId={(invoice as any).organization_id}
        override={registrationCode}
      />

      {/* Payment Information */}
      <div className="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Payment Terms:</strong> Net 30 days</p>
        <p><strong>Due Date:</strong> {format(new Date(invoice.due_date), 'MMM dd, yyyy')}</p>
        <p>Please include invoice number {invoice.invoice_number} with your payment.</p>
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #d1d5db', display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>Remit Check Payments To:</p>
            <p style={{ margin: '0.1rem 0' }}>The HESS Consortium</p>
            <p style={{ margin: '0.1rem 0' }}>952 Winchester Rd #1051</p>
            <p style={{ margin: '0.1rem 0' }}>Lexington, KY 40505</p>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid #d1d5db', paddingLeft: '1rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>HESS ACH Payment Information:</p>
            <p style={{ margin: '0.1rem 0' }}><strong>Account number:</strong> 837993307</p>
            <p style={{ margin: '0.1rem 0' }}><strong>Routing number:</strong> 083000137</p>
        </div>
        <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.9rem' }}>
          Need our W-9?{' '}
          <a
            href={`https://members.hessconsortium.app${hessW9Asset.url}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0c2340', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            Download the HESS Consortium W-9 (PDF)
          </a>
          .
        </p>
      </div>
      </div>

      {/* Footer */}
      <div className="footer-section">
        <p>Questions about your invoice?</p>
        <p>Contact us at: billing@hessconsortium.org</p>
        <p>Visit us online: www.hessconsortium.org</p>
        <br />
        <p>Thank you for being a valued member of the HESS Consortium community!</p>
      </div>
    </div>
  );
}

function ConferenceRegistrationCodeBlock({
  organizationId,
  override,
}: {
  organizationId?: string | null;
  override?: string | null;
}) {
  const { data } = useConferenceRegistrationCode(organizationId);
  const code = override || data?.code;
  if (!code) return null;
  return (
    <div
      style={{
        margin: '1.5rem 0',
        padding: '1rem 1.25rem',
        border: '2px dashed #0c2340',
        borderRadius: 6,
        background: '#f3f6fb',
      }}
    >
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0c2340', margin: 0 }}>
        HESS 2026 Conference Registration Code
      </h3>
      <p style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '0.85rem', color: '#444' }}>
        Use this unique code to register <strong>one attendee</strong> from your
        institution for the HESS 2026 Conference:
      </p>
      <div
        style={{
          margin: '0.75rem 0 0 0',
          padding: '0.5rem 0.75rem',
          background: '#fffbea',
          border: '1px solid #f59e0b',
          borderRadius: 4,
          fontSize: '0.8rem',
          color: '#92400e',
          fontWeight: 600,
        }}
      >
        IMPORTANT: This code is valid for one attendee only from this
        organization and may not be transferred to another institution.
      </div>
      <p
        style={{
          margin: '0.75rem 0 0 0',
          fontFamily: 'Menlo, Consolas, monospace',
          fontSize: '1.15rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: '#0c2340',
        }}
      >
        {code}
      </p>
    </div>
  );
}