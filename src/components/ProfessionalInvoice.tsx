import { format } from 'date-fns';
import { useInvoiceTemplates } from '@/hooks/useInvoiceTemplates';
import { Invoice } from '@/hooks/useInvoices';

interface ProfessionalInvoiceProps {
  invoice: Invoice;
  template?: any;
}

export function ProfessionalInvoice({ invoice, template }: ProfessionalInvoiceProps) {
  const { getDefaultTemplate } = useInvoiceTemplates();
  const activeTemplate = template || getDefaultTemplate();

  if (!activeTemplate) {
    return <div>Loading template...</div>;
  }

  // Template variable replacements
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
    '{{CONTACT_EMAIL}}': 'billing@company.com',
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
    <div className="invoice-container bg-white p-8 max-w-4xl mx-auto shadow-lg">
      {/* Custom Styles */}
      <style>
        {`
          .invoice-container {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          
          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 3px solid #6b7280;
          }
          
          .logo-section img {
            max-height: 80px;
            width: auto;
          }
          
          .invoice-title h1 {
            font-size: 2.5rem;
            font-weight: bold;
            color: #6b7280;
            margin: 0;
          }
          
          .invoice-number {
            font-size: 1.1rem;
            color: #666;
            margin: 0.5rem 0 0 0;
          }
          
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 2rem;
          }
          
          .detail-section h3 {
            font-size: 1.1rem;
            font-weight: 600;
            color: #6b7280;
            margin-bottom: 0.5rem;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.25rem;
          }
          
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .invoice-table th {
            background: linear-gradient(135deg, #6b7280, #4b5563);
            color: white;
            padding: 1rem;
            text-align: left;
            font-weight: 600;
          }
          
          .invoice-table td {
            padding: 1rem;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .invoice-table .amount-cell {
            text-align: right;
            font-weight: 600;
          }
          
          .total-row {
            background: #f8fafc;
            font-weight: bold;
            font-size: 1.1rem;
          }
          
          .footer-content {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 2px solid #e5e7eb;
          }
          
          .payment-info {
            background: #f9fafb;
            padding: 1.5rem;
            border-left: 4px solid #6b7280;
            margin-bottom: 1rem;
          }
          
          .payment-info h3 {
            color: #6b7280;
            margin-bottom: 0.5rem;
          }
          
          .contact-info {
            text-align: center;
            padding: 1rem;
            background: #f8fafc;
            border-radius: 0.5rem;
          }
          
          @media print {
            .invoice-container {
              box-shadow: none;
              margin: 0;
              padding: 1rem;
            }
          }
        `}
      </style>

      {/* Header */}
      <div dangerouslySetInnerHTML={{ __html: headerHtml }} />

      {/* Invoice Details */}
      <div className="invoice-details">
        <div className="detail-section">
          <h3>Bill To:</h3>
          <p><strong>{invoice.organizations?.name}</strong></p>
          <p>{getOrganizationAddress(invoice)}</p>
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
                <div className="text-sm text-gray-600 mt-1">
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
                  <div className="text-sm text-gray-500 line-through">
                    ${invoice.amount.toLocaleString()}
                  </div>
                </>
              ) : (
                `$${invoice.amount.toLocaleString()}`
              )}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td colSpan={2}><strong>Total Due:</strong></td>
            <td className="amount-cell">
              <strong>${(invoice.prorated_amount || invoice.amount).toLocaleString()}</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {invoice.notes && (
        <div className="notes-section">
          <h3>Notes:</h3>
          <p>{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
    </div>
  );
}