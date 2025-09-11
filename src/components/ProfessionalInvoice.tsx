import { format } from 'date-fns';
import { useInvoiceTemplates } from '@/hooks/useInvoiceTemplates';
import { Invoice } from '@/hooks/useInvoices';

interface ProfessionalInvoiceProps {
  invoice: Invoice;
  template?: any;
}

export function ProfessionalInvoice({ invoice, template }: ProfessionalInvoiceProps) {
  const { getDefaultTemplate } = useInvoiceTemplates();
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
    '{{AMOUNT}}': `$${invoice.amount.toLocaleString()}`,
    '{{PRORATED_AMOUNT}}': invoice.prorated_amount ? `$${invoice.prorated_amount.toLocaleString()}` : '',
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

  return (
    <div className="invoice-container bg-white p-8 max-w-4xl mx-auto">
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
                  <div>${invoice.prorated_amount.toLocaleString()}</div>
                </>
              ) : (
                `$${invoice.amount.toLocaleString()}`
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Total Due */}
      <div className="total-section">
        <p><strong>Total Due: ${(invoice.prorated_amount || invoice.amount).toLocaleString()}</strong></p>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="notes-section">
          <h3>Notes:</h3>
          <p>{invoice.notes}</p>
        </div>
      )}

      {/* Payment Information */}
      <div className="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Payment Terms:</strong> Net 30 days</p>
        <p><strong>Due Date:</strong> {format(new Date(invoice.due_date), 'MMM dd, yyyy')}</p>
        <p>Please include invoice number {invoice.invoice_number} with your payment.</p>
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