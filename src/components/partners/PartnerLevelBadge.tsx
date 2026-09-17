import { Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePartnershipLevels } from '@/hooks/usePartnershipLevels';

export function PartnerLevelBadge({
  levelId,
  size = 'default',
}: {
  levelId?: string | null;
  size?: 'sm' | 'default';
}) {
  const { data: levels = [] } = usePartnershipLevels();
  if (!levelId) return null;

  const level = levels.find((l) => l.id === levelId);
  if (!level) return null;

  const variant = (['default', 'secondary', 'outline'].includes(level.badge_style)
    ? level.badge_style
    : 'default') as 'default' | 'secondary' | 'outline';

  return (
    <Badge variant={variant} className={`gap-1 ${size === 'sm' ? 'text-[10px] py-0' : 'text-xs'}`}>
      <Award className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {level.name}
    </Badge>
  );
}
