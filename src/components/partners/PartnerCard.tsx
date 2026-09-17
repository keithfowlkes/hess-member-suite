import { Link } from 'react-router-dom';
import { Building2, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BusinessPartner } from '@/hooks/useBusinessPartners';
import { PartnerLevelBadge } from './PartnerLevelBadge';

export function PartnerCard({
  partner,
  basePath = '/partners',
}: {
  partner: BusinessPartner;
  basePath?: string;
}) {
  return (
    <Link to={`${basePath}/${partner.slug}`} className="group">
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
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
          {partner.partnership_level_id && (
            <div className="flex">
              <PartnerLevelBadge levelId={partner.partnership_level_id} size="sm" />
            </div>
          )}
          {partner.short_description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{partner.short_description}</p>
          )}
          {partner.categories?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {partner.categories.slice(0, 3).map((category) => (
                <Badge key={category} variant="secondary" className="text-xs font-normal">
                  {category}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
