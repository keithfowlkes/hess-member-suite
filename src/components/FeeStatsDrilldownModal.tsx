import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2 } from 'lucide-react';

interface OrgRow {
  id: string;
  name: string;
  membership_status?: string;
  annual_fee_amount?: number;
  membership_end_date?: string;
  email?: string;
  city?: string;
  state?: string;
}

interface SummaryStat {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

interface FeeStatsDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  organizations: OrgRow[];
  summary?: SummaryStat[];
  amountLabel?: string;
  getAmount?: (org: OrgRow) => number | null | undefined;
}

const toneClasses: Record<string, string> = {
  default: 'bg-gray-50 text-gray-900 border-gray-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
};

export function FeeStatsDrilldownModal({
  isOpen,
  onClose,
  title,
  description,
  organizations,
  summary,
  amountLabel = 'Annual Fee',
  getAmount,
}: FeeStatsDrilldownModalProps) {
  const sorted = [...organizations].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {title} ({sorted.length})
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </DialogHeader>

        {summary && summary.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {summary.map((s) => (
              <div
                key={s.label}
                className={`rounded-md border p-3 ${toneClasses[s.tone || 'default']}`}
              >
                <div className="text-xs font-medium opacity-80">{s.label}</div>
                <div className="text-lg font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <ScrollArea className="mt-3 max-h-[55vh] pr-3">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No organizations to display.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left border-b sticky top-0 bg-white">
                <tr>
                  <th className="py-2 pr-2">Organization</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2 text-right">{amountLabel}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((org) => {
                  const amt = getAmount
                    ? getAmount(org)
                    : org.annual_fee_amount;
                  return (
                    <tr key={org.id} className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        <div className="font-medium text-gray-900">{org.name}</div>
                        {(org.city || org.state) && (
                          <div className="text-xs text-muted-foreground">
                            {[org.city, org.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <Badge variant="secondary" className="capitalize">
                          {org.membership_status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {amt != null
                          ? `$${Number(amt).toLocaleString()}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
