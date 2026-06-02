import { useMemo, useState } from 'react';
import enrollmentData from '@/data/hessEnrollment.json';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, X, Search } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Institution {
  name: string;
  city: string;
  state: string;
  enrollment: Record<string, number>;
}

const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025'];

const LINE_COLORS = [
  'hsl(var(--primary))',
  'hsl(220 70% 50%)',
  'hsl(160 60% 45%)',
  'hsl(30 80% 55%)',
  'hsl(280 65% 60%)',
  'hsl(340 75% 55%)',
  'hsl(190 70% 45%)',
  'hsl(50 85% 50%)',
];

export function HessEnrollmentTrends() {
  const data = enrollmentData as Institution[];
  const [selected, setSelected] = useState<string[]>([]);
  const [combined, setCombined] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q),
    );
  }, [data, search]);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const clearAll = () => setSelected([]);

  const chartData = useMemo(() => {
    const selectedInsts = data.filter((d) => selected.includes(d.name));
    return YEARS.map((y) => {
      const row: Record<string, number | string> = { year: y };
      if (combined) {
        row['All Institutions (Total)'] = data.reduce(
          (sum, d) => sum + (d.enrollment[y] || 0),
          0,
        );
      }
      selectedInsts.forEach((inst) => {
        row[inst.name] = inst.enrollment[y] || 0;
      });
      return row;
    });
  }, [data, selected, combined]);

  const lines: { key: string; color: string }[] = [];
  if (combined) {
    lines.push({ key: 'All Institutions (Total)', color: 'hsl(var(--primary))' });
  }
  selected.forEach((name, i) => {
    lines.push({
      key: name,
      color: LINE_COLORS[(i + (combined ? 1 : 0)) % LINE_COLORS.length],
    });
  });

  const formatNum = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[260px]">
          <Label className="text-sm font-medium mb-2 block">Institutions</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                role="combobox"
              >
                <span className="truncate">
                  {selected.length === 0
                    ? 'Select institutions...'
                    : `${selected.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, city, state..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-72">
                <div className="p-1">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 text-center">
                      No institutions found.
                    </p>
                  ) : (
                    filtered.map((inst) => (
                      <label
                        key={inst.name}
                        className="flex items-start gap-2 p-2 rounded-sm hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selected.includes(inst.name)}
                          onCheckedChange={() => toggle(inst.name)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {inst.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {inst.city}, {inst.state}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 pb-1">
          <Switch
            id="combined-toggle"
            checked={combined}
            onCheckedChange={setCombined}
          />
          <Label htmlFor="combined-toggle" className="text-sm cursor-pointer">
            Show combined total ({data.length} institutions)
          </Label>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selected.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1">
              {name}
              <button
                onClick={() => toggle(name)}
                className="hover:text-destructive"
                aria-label={`Remove ${name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7">
            Clear all
          </Button>
        </div>
      )}

      {lines.length === 0 ? (
        <div className="h-[400px] flex items-center justify-center border rounded-lg bg-muted/30">
          <p className="text-muted-foreground text-sm">
            Select one or more institutions, or enable the combined total view.
          </p>
        </div>
      ) : (
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="year" className="text-xs" />
              <YAxis
                className="text-xs"
                tickFormatter={(v) => v.toLocaleString()}
                width={80}
              />
              <Tooltip
                formatter={(v: number) => formatNum(v)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {lines.map((l) => (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">
        Enrollment trend data from 2020 to 2025 across {data.length} HESS member institutions.
      </p>
    </div>
  );
}
