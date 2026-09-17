import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { usePartnershipLevels } from '@/hooks/usePartnershipLevels';
import { PartnerCard } from './PartnerCard';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

export function PartnerDirectory({ basePath = '/partners' }: { basePath?: string }) {
  const { data: partners = [], isLoading } = useBusinessPartners();
  const { data: levels = [] } = usePartnershipLevels();
  const highlightedLevelIds = useMemo(
    () => new Set(levels.filter((l) => l.is_highlighted).map((l) => l.id)),
    [levels],
  );
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = partners.filter((p) => {
      if (!term) return true;
      const searchableText = [
        p.name,
        p.short_description ?? '',
        stripHtml(p.description_html ?? ''),
        ...(p.categories ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(term);
    });
    // Highlighted-level partners lead the grid; relative order is otherwise preserved.
    return [
      ...matches.filter((p) => highlightedLevelIds.has(p.partnership_level_id ?? '')),
      ...matches.filter((p) => !highlightedLevelIds.has(p.partnership_level_id ?? '')),
    ];
  }, [partners, search, highlightedLevelIds]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partners by name or service..."
            className="pl-9"
            maxLength={100}
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={activeCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveCategory(null)}
            >
              All
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={activeCategory === category ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No business partners match your search yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  );
}
