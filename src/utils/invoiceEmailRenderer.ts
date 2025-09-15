import { format } from 'date-fns';

interface InvoiceEmailData {
  organization_name: string;
  invoice_number: string;
  amount: string;
  prorated_amount?: string;
  due_date: string;
  period_start_date: string;
  period_end_date: string;
  notes?: string;
}

export function renderInvoiceEmailHTML(data: InvoiceEmailData): string {
  const invoiceDate = format(new Date(), 'MMM dd, yyyy');
  const dueDate = format(new Date(data.due_date), 'MMM dd, yyyy');
  const periodStart = format(new Date(data.period_start_date), 'MMM dd, yyyy');
  const periodEnd = format(new Date(data.period_end_date), 'MMM dd, yyyy');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: white; color: #333; font-size: 14px; line-height: 1.4;">
      <!-- Header with Logo and Invoice Title -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #666;">
        <div>
          <img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS LOGO" style="max-height: 80px; width: auto; margin-bottom: 1rem;">
          <div>
            <h3 style="font-size: 1rem; font-weight: bold; margin: 0 0 0.25rem 0;">HESS Consortium</h3>
            <p style="margin: 0.1rem 0; font-size: 0.9rem; color: #555;">Higher Education Systems & Services Consortium</p>
            <p style="margin: 0.1rem 0; font-size: 0.9rem; color: #555;">A consortium of private, non-profit colleges and universities</p>
          </div>
        </div>
        <div style="text-align: right;">
          <h1 style="font-size: 2rem; font-weight: bold; color: #666; margin: 0; letter-spacing: 2px;">INVOICE</h1>
          <p style="font-size: 0.9rem; color: #666; margin: 0.5rem 0 0 0;">Invoice #${data.invoice_number}</p>
        </div>
      </div>

      <!-- Bill To and Invoice Details -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 2rem;">
        <div>
          <h3 style="font-size: 1rem; font-weight: bold; color: #333; margin-bottom: 0.75rem;">Bill To:</h3>
          <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>${data.organization_name}</strong></p>
          <p style="margin: 0.25rem 0; font-size: 0.9rem;">Organization Address</p>
        </div>
        <div>
          <h3 style="font-size: 1rem; font-weight: bold; color: #333; margin-bottom: 0.75rem;">Invoice Details:</h3>
          <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Invoice Date:</strong> ${invoiceDate}</p>
          <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Due Date:</strong> ${dueDate}</p>
          <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Period:</strong> ${periodStart} - ${periodEnd}</p>
        </div>
      </div>

      <!-- Invoice Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 2rem 0;">
        <thead>
          <tr style="background: #6b7280;">
            <th style="color: white; padding: 0.75rem; text-align: left; font-weight: bold; font-size: 0.9rem;">Description</th>
            <th style="color: white; padding: 0.75rem; text-align: left; font-weight: bold; font-size: 0.9rem;">Period</th>
            <th style="color: white; padding: 0.75rem; text-align: right; font-weight: bold; font-size: 0.9rem;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 0.75rem;">
              <strong>Annual Membership Fee</strong>
              ${data.prorated_amount ? '<div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">Prorated from membership start date</div>' : ''}
            </td>
            <td style="padding: 0.75rem;">
              ${periodStart} - ${periodEnd}
            </td>
            <td style="padding: 0.75rem; text-align: right; font-weight: normal;">
              ${data.amount}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Total Due -->
      <div style="text-align: right; margin: 1rem 0; font-weight: bold; font-size: 1rem;">
        <p><strong>Total Due: ${data.amount}</strong></p>
      </div>

      ${data.notes ? `
      <!-- Notes -->
      <div style="margin: 2rem 0;">
        <h3 style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">Notes:</h3>
        <p>${data.notes}</p>
      </div>
      ` : ''}

      <!-- Payment Information -->
      <div style="background: #f8f9fa; padding: 1rem; border-left: 4px solid #6b7280; margin: 2rem 0;">
        <h3 style="font-size: 1rem; font-weight: bold; color: #333; margin-bottom: 0.5rem;">Payment Information</h3>
        <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Payment Terms:</strong> Net 30 days</p>
        <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Due Date:</strong> ${dueDate}</p>
        <p style="margin: 0.25rem 0; font-size: 0.9rem;">Please include invoice number ${data.invoice_number} with your payment.</p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 3rem; padding-top: 2rem; font-size: 0.9rem; color: #666;">
        <p style="margin: 0.25rem 0;">Questions about your invoice?</p>
        <p style="margin: 0.25rem 0;">Contact us at: billing@hessconsortium.org</p>
        <p style="margin: 0.25rem 0;">Visit us online: www.hessconsortium.org</p>
        <br>
        <p style="margin: 0.25rem 0;">Thank you for being a valued member of the HESS Consortium community!</p>
      </div>
    </div>
  `;
}