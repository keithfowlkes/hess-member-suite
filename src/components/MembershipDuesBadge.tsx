import { Badge } from '@/components/ui/badge';
import type { Invoice } from '@/hooks/useInvoices';
import { getMembershipDuesStatus } from '@/utils/membershipDuesStatus';

interface MembershipDuesBadgeProps {
  invoices: Invoice[] | undefined | null;
  /** Render compact badge (smaller padding/text) — useful in card grids. */
  compact?: boolean;
  className?: string;
}

/**
 * Renders the shared PAID / MEMBERSHIP FEE DUE badge used across the portal,
 * driven by getMembershipDuesStatus. Returns null if neither applies.
 */
export function MembershipDuesBadge({ invoices, compact = false, className }: MembershipDuesBadgeProps) {
  const { isPaid, unpaidInvoice } = getMembershipDuesStatus(invoices ?? []);

  const sizing = compact
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-3 py-1';

  if (isPaid) {
    return (
      <Badge
        className={`bg-green-600 hover:bg-green-600 text-white font-semibold tracking-wide ${sizing} ${className ?? ''}`}
      >
        PAID
      </Badge>
    );
  }

  if (unpaidInvoice) {
    const dueLabel = new Date(unpaidInvoice.due_date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <Badge
        className={`bg-amber-500 hover:bg-amber-500 text-white font-semibold tracking-wide whitespace-normal text-center ${sizing} ${className ?? ''}`}
      >
        {compact ? `DUE ${dueLabel}` : `MEMBERSHIP FEE DUE ${dueLabel}`}
      </Badge>
    );
  }

  return null;
}
