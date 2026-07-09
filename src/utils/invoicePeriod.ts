import { format } from 'date-fns';

export const CURRENT_INVOICE_PERIOD_START = '2026-07-30';
export const CURRENT_INVOICE_PERIOD_END = '2027-07-30';

export function parseInvoiceDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatInvoiceDate(value: string | Date | null | undefined, pattern = 'MMM dd, yyyy') {
  const parsed = parseInvoiceDate(value);
  return parsed ? format(parsed, pattern) : String(value || '');
}

export function toInvoiceDateString(value: string | Date | null | undefined) {
  const parsed = parseInvoiceDate(value);
  return parsed ? format(parsed, 'yyyy-MM-dd') : '';
}

export function getCurrentInvoicePeriod(termStartValue?: string | Date | null) {
  const startDate = parseInvoiceDate(termStartValue) || parseInvoiceDate(CURRENT_INVOICE_PERIOD_START)!;
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    startDate,
    endDate,
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(endDate, 'yyyy-MM-dd'),
  };
}

export function applyCurrentInvoicePeriod<T extends { period_start_date: string; period_end_date: string }>(
  invoice: T,
  termStartValue?: string | Date | null,
): T {
  const period = getCurrentInvoicePeriod(termStartValue);
  return {
    ...invoice,
    period_start_date: period.start,
    period_end_date: period.end,
  };
}