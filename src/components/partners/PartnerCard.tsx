import { Link } from 'react-router-dom';
import { Building2, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { BusinessPartner } from '@/hooks/useBusinessPartners';
import { usePartnershipLevels } from '@/hooks/usePartnershipLevels';
import { PartnerLevelBadge } from './PartnerLevelBadge';

export function PartnerCard({
  partner,
  basePath = '/partners',
}: {
  partner: BusinessPartner;
  basePath?: string;
}) {
  const { data: levels = [] } = usePartnershipLevels();
  const level = levels.find((l) => l.id === partner.partnership_level_id);
  const highlighted = !!level?.is_highlighted;

  return (
    <Link to={`${basePath}/${partner.slug}`} className="group block h-full">
      <Card
        className={
          highlighted
            ? 'h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ring-2 ring-primary/60 border-primary/40 shadow-md'
            : 'h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5'
        }
      >
        {highlighted && (
          <div className="flex items-center gap-1.5 bg-primary px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
            <Star className="h-3 w-3 fill-current" />
            {level?.name}
          </div>
        )}
        <div className="h-28 bg-muted flex items-center justify-center overflow-hidden border-b border-border">
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt={`${partner.name} logo`}
              className="max-h-20 max-w-[70%] object-contain"
              loading="lazy"
            />
          ) : (
            <Building2 className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {partner.name}
            </h3>
            {partner.is_featured && (
              <Star className="h-4 w-4 text-primary shrink-0 fill-current" aria-label="Featured partner" />
            )}
          </div>
          {partner.partnership_level_id && !highlighted && (
            <div className="flex">
              <PartnerLevelBadge levelId={partner.partnership_level_id} size="sm" />
            </div>
          )}
          {partner.short_description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{partner.short_description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
