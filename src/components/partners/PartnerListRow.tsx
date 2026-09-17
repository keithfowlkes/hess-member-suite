import { Link } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';
import { PartnerLevelBadge } from './PartnerLevelBadge';
import { usePartnershipLevels } from '@/hooks/usePartnershipLevels';
import type { BusinessPartner } from '@/hooks/useBusinessPartners';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function PartnerListRow({
  partner,
  basePath,
}: {
  partner: BusinessPartner;
  basePath: string;
}) {
  const { data: levels = [] } = usePartnershipLevels();
  const level = levels.find((l) => l.id === partner.partnership_level_id);
  const isHighlighted = !!level?.is_highlighted;
  const summary = partner.short_description?.trim() || stripHtml(partner.description_html ?? '');

  return (
    <Link
      to={`${basePath}/${partner.slug}`}
      className={`group flex items-center gap-4 rounded-lg border bg-card p-3 transition-shadow hover:shadow-md ${
        isHighlighted ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border'
      }`}
    >
      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-muted/60 p-1.5">
        {partner.logo_url ? (
          <img
            src={partner.logo_url}
            alt={`${partner.name} logo`}
            className="max-h-9 max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <Building2 className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-foreground group-hover:text-primary">
            {partner.name}
          </span>
          <PartnerLevelBadge levelId={partner.partnership_level_id} size="sm" />
        </div>
        {summary && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{summary}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
