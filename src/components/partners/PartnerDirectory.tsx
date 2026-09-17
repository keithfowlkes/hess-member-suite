import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { usePartnershipLevels } from '@/hooks/usePartnershipLevels';
import { PartnerCard } from './PartnerCard';

export function PartnerDirectory({ basePath = '/partners' }: { basePath?: string }) {
  const { data: partners = [], isLoading } = useBusinessPartners();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    partners.forEach((p) => p.categories?.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [partners]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return partners.filter((p) => {
      const matchesCategory = !activeCategory || p.categories?.includes(activeCategory);
      const matchesTerm =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.short_description ?? '').toLowerCase().includes(term) ||
        (p.categories ?? []).some((c) => c.toLowerCase().includes(term));
      return matchesCategory && matchesTerm;
    });
  }, [partners, search, activeCategory]);

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
