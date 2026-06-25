// Shared invoice email HTML generator.
// Mirrors the on-screen ProfessionalInvoice component (src/components/ProfessionalInvoice.tsx)
// using the exact gray palette (#666, #6b7280, #f8f9fa) and tightened spacing so the
// email renders on a single US-letter (8.5" x 11") page when printed.

export interface InvoiceHtmlInput {
  invoiceNumber: string;
  invoiceDate: string;       // ISO or yyyy-mm-dd
  dueDate: string;           // ISO or yyyy-mm-dd
  periodStart: string;       // ISO or yyyy-mm-dd
  periodEnd: string;         // ISO or yyyy-mm-dd
  organizationName: string;
  organizationEmail?: string | null;
  amount: number;
  proratedAmount?: number | null;
  notes?: string | null;
  invoiceId?: string | null; // when provided, renders the "Pay this invoice online" button
  paidDate?: string | null;  // when provided, renders a "PAID" stamp with this date
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatCurrency(n: number): string {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildInvoiceEmailHtml(input: InvoiceHtmlInput): string {
  const {
    invoiceNumber, invoiceDate, dueDate, periodStart, periodEnd,
    organizationName, organizationEmail, amount, proratedAmount, notes, invoiceId, paidDate,
  } = input;

  const totalAmount = proratedAmount ?? amount;
  const amountDisplay = formatCurrency(totalAmount);
  const invDate = formatDate(invoiceDate);
  const due = formatDate(dueDate);
  const pStart = formatDate(periodStart);
  const pEnd = formatDate(periodEnd);
  const isPaid = !!paidDate;
  const paidOn = paidDate ? formatDate(paidDate) : '';
  const payLink = !isPaid && invoiceId ? `https://www.hessconsortium.org/new/hess-member-portal/` : '';

  // A diagonal "PAID" stamp anchored top-right of the invoice body when paidDate is set.
  const paidStamp = isPaid ? `
    <div style="position: relative; height: 0;">
      <div style="position: absolute; top: -4px; right: 8px; transform: rotate(-14deg); border: 4px solid #16a34a; color: #16a34a; padding: 6px 18px; font-size: 32px; font-weight: 900; letter-spacing: 4px; font-family: Arial, sans-serif; border-radius: 6px; background: rgba(255,255,255,0.85); box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
        PAID
        <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px; text-align: center; margin-top: 2px;">${paidOn}</div>
      </div>
    </div>` : '';

  // Sizing is tuned so the rendered email fits on a single 8.5" x 11" page.
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.4; color: #333; font-size: 14px; background: #ffffff; padding: 16px 20px; max-width: 760px; margin: 0 auto;">
    ${paidStamp}
    <!-- Header: logo/company info + INVOICE title -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #666;">
      <tr>
        <td style="vertical-align: top; width: 60%;">
          <img src="https://members.hessconsortium.app/lovable-uploads/c2026cbe-1547-4c12-ba1e-542841a78351.png" alt="HESS Consortium Logo" style="max-height: 64px; width: auto; display: block; margin-bottom: 8px;">
          <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 2px 0; color: #333;">HESS Consortium</h3>
          <p style="margin: 1px 0; font-size: 12px; color: #555;">Higher Education Systems &amp; Services Consortium</p>
          <p style="margin: 1px 0; font-size: 12px; color: #555;">A consortium of private, non-profit colleges and universities</p>
        </td>
        <td style="vertical-align: top; text-align: right; width: 40%;">
          <h1 style="font-size: 28px; font-weight: bold; color: #666; margin: 0; letter-spacing: 2px;">INVOICE</h1>
          <p style="font-size: 12px; color: #666; margin: 6px 0 0 0;">Invoice #${invoiceNumber}</p>
        </td>
      </tr>
    </table>

    <!-- Bill To / Invoice Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="vertical-align: top; width: 50%; padding-right: 24px;">
          <h3 style="font-size: 14px; font-weight: bold; color: #333; margin: 0 0 8px 0;">Bill To:</h3>
          <p style="margin: 2px 0; font-size: 13px;"><strong>${organizationName}</strong></p>
          <p style="margin: 2px 0; font-size: 13px;">Organization Address</p>
          ${organizationEmail ? `<p style="margin: 2px 0; font-size: 13px;">${organizationEmail}</p>` : ''}
        </td>
        <td style="vertical-align: top; width: 50%;">
          <h3 style="font-size: 14px; font-weight: bold; color: #333; margin: 0 0 8px 0;">Invoice Details:</h3>
          <p style="margin: 2px 0; font-size: 13px;"><strong>Invoice Date:</strong> ${invDate}</p>
          <p style="margin: 2px 0; font-size: 13px;"><strong>Due Date:</strong> ${due}</p>
          <p style="margin: 2px 0; font-size: 13px;"><strong>Period:</strong> ${pStart} - ${pEnd}</p>
        </td>
      </tr>
    </table>

    <!-- Line items -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr>
          <th style="background: #6b7280; color: #ffffff; padding: 10px 12px; text-align: left; font-weight: bold; font-size: 13px;">Description</th>
          <th style="background: #6b7280; color: #ffffff; padding: 10px 12px; text-align: left; font-weight: bold; font-size: 13px;">Period</th>
          <th style="background: #6b7280; color: #ffffff; padding: 10px 12px; text-align: right; font-weight: bold; font-size: 13px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px 12px; vertical-align: top; font-size: 13px;">
            <strong>Annual Membership Fee</strong>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">includes Stripe Processing Fee</div>
            ${proratedAmount ? '<div style="font-size: 12px; color: #666; margin-top: 4px;">Prorated from membership start date</div>' : ''}
          </td>
          <td style="padding: 10px 12px; vertical-align: top; font-size: 13px;">${pStart} - ${pEnd}</td>
          <td style="padding: 10px 12px; vertical-align: top; text-align: right; font-size: 13px;">${amountDisplay}</td>
        </tr>
      </tbody>
    </table>

    <!-- Total -->
    <div style="text-align: right; margin: 8px 0 16px 0; font-weight: bold; font-size: 14px; color: #333;">
      <p style="margin: 0;"><strong>Total Due: ${amountDisplay}</strong></p>
    </div>

    ${notes ? `<div style="margin: 12px 0;"><h3 style="font-size: 14px; font-weight: bold; margin: 0 0 4px 0; color: #333;">Notes:</h3><p style="margin: 0; font-size: 13px;">${notes}</p></div>` : ''}

    <!-- Payment information (matches preview: #f8f9fa background, #6b7280 left border) -->
    <div style="background: #f8f9fa; padding: 12px 14px; border-left: 4px solid #6b7280; margin: 16px 0;">
      <h3 style="font-size: 14px; font-weight: bold; color: #333; margin: 0 0 6px 0;">Payment Information</h3>
      <p style="margin: 2px 0; font-size: 13px;"><strong>Payment Terms:</strong> Net 30 days</p>
      <p style="margin: 2px 0; font-size: 13px;"><strong>Due Date:</strong> ${due}</p>
      <p style="margin: 2px 0; font-size: 13px;">Please include invoice number ${invoiceNumber} with your payment.</p>
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #d1d5db;">
        <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold;">Remit Check Payments To:</p>
        <p style="margin: 1px 0; font-size: 13px;">The HESS Consortium</p>
        <p style="margin: 1px 0; font-size: 13px;">952 Winchester Rd #1051</p>
        <p style="margin: 1px 0; font-size: 13px;">Lexington, KY 40505</p>
      </div>
      ${invoiceId ? `
      <p style="text-align: center; margin: 12px 0 6px 0; font-size: 14px; font-weight: bold; color: #333;">OR</p>
      <div style="text-align: center; margin: 0 0 2px 0;">
        <a href="${payLink}" style="display: inline-block; background: #6b7280; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-weight: bold; font-size: 13px;">Pay this invoice online</a>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 18px; padding-top: 12px; font-size: 12px; color: #666;">
      <p style="margin: 2px 0;">Questions about your invoice? Contact us at billing@hessconsortium.org</p>
      <p style="margin: 2px 0;">Visit us online: www.hessconsortium.org</p>
      <p style="margin: 8px 0 2px 0;">Thank you for being a valued member of the HESS Consortium community!</p>
    </div>
  </div>`;
}
