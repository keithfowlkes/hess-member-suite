import type { Invoice } from '@/hooks/useInvoices';

/**
 * Shared helpers for determining an organization's membership-dues status
 * from its invoice list. Use these everywhere in the member portal so the
 * "PAID" / "DUE" UI stays consistent.
 */

const isOpenStatus = (status: Invoice['status']) =>
  status !== 'paid' && status !== 'cancelled';

const periodCoversToday = (inv: Invoice, today: Date) => {
  if (!inv.period_start_date || !inv.period_end_date) return false;
  const start = new Date(inv.period_start_date);
  const end = new Date(inv.period_end_date);
  return today >= start && today <= end;
};

/** True when the org has a paid invoice covering today (or fallback: paid in current calendar year). */
export function isDuesPaidForCurrentPeriod(
  invoices: Invoice[] | undefined | null,
  now: Date = new Date()
): boolean {
  if (!invoices || invoices.length === 0) return false;
  return invoices.some((inv) => {
    if (inv.status !== 'paid') return false;
    if (inv.period_start_date && inv.period_end_date) {
      return periodCoversToday(inv, now);
    }
    const yearRef = inv.period_start_date || inv.created_at;
    return yearRef ? new Date(yearRef).getFullYear() === now.getFullYear() : false;
  });
}

/**
 * The most relevant unpaid invoice for the current period, or null if dues are
 * already paid / no open invoice exists. Prefers an invoice whose period covers
 * today; otherwise falls back to the most recently due open invoice in the
 * current calendar year.
 */
export function getCurrentPeriodUnpaidInvoice(
  invoices: Invoice[] | undefined | null,
  now: Date = new Date()
): Invoice | null {
  if (!invoices || invoices.length === 0) return null;
  if (isDuesPaidForCurrentPeriod(invoices, now)) return null;

  const covering = invoices.find(
    (inv) => isOpenStatus(inv.status) && periodCoversToday(inv, now)
  );
  if (covering) return covering;

  const thisYear = invoices
    .filter((inv) => isOpenStatus(inv.status))
    .filter((inv) => {
      const ref = inv.period_start_date || inv.due_date || inv.invoice_date;
      return ref ? new Date(ref).getFullYear() === now.getFullYear() : false;
    })
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  return thisYear[0] || null;
}

export interface MembershipDuesStatus {
  isPaid: boolean;
  unpaidInvoice: Invoice | null;
}

/** Convenience wrapper that returns both flags in one call. */
export function getMembershipDuesStatus(
  invoices: Invoice[] | undefined | null,
  now: Date = new Date()
): MembershipDuesStatus {
  const isPaid = isDuesPaidForCurrentPeriod(invoices, now);
  return {
    isPaid,
    unpaidInvoice: isPaid ? null : getCurrentPeriodUnpaidInvoice(invoices, now),
  };
}
