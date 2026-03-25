import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { Search, Shield, AlertTriangle, Eye, Building2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import arcticLogo from '@/assets/arctic-logo.png';

// ── Raw sample data ──
const RAW_DATA = [
  {"observation time":"2026-02","organization":"Aaronfurt University","category":"public exposure","# events":"1"},
  {"observation time":"2026-02","organization":"Aaronfurt University","category":"suspected compromise","# events":"6"},
  {"observation time":"2026-02","organization":"Allenshire University","category":"suspected compromise","# events":"4"},
  {"observation time":"2026-02","organization":"Bakerchester University","category":"suspected compromise","# events":"2"},
  {"observation time":"2026-02","organization":"Blakestad University","category":"suspected compromise","# events":"155"},
  {"observation time":"2026-02","organization":"Bradleymouth University","category":"suspected compromise","# events":"133"},
  {"observation time":"2026-02","organization":"Bridgesview University","category":"public exposure","# events":"6"},
  {"observation time":"2026-02","organization":"Bridgesview University","category":"suspected compromise","# events":"495"},
  {"observation time":"2026-02","organization":"Cohenmouth University","category":"suspected compromise","# events":"244"},
  {"observation time":"2026-02","organization":"Cummingsview University","category":"public exposure","# events":"1"},
  {"observation time":"2026-02","organization":"Cummingsview University","category":"suspected compromise","# events":"21"},
  {"observation time":"2026-02","organization":"Davidberg University","category":"suspected compromise","# events":"2"},
  {"observation time":"2026-02","organization":"Davidbury University","category":"public exposure","# events":"3"},
  {"observation time":"2026-02","organization":"Davidbury University","category":"suspected compromise","# events":"33"},
  {"observation time":"2026-02","organization":"Davisburgh University","category":"suspected compromise","# events":"1"},
  {"observation time":"2026-02","organization":"Dianechester University","category":"public exposure","# events":"3"},
  {"observation time":"2026-02","organization":"Dianechester University","category":"suspected compromise","# events":"2"},
  {"observation time":"2026-02","organization":"Diaztown University","category":"public exposure","# events":"17"},
  {"observation time":"2026-02","organization":"Diaztown University","category":"suspected compromise","# events":"570"},
  {"observation time":"2026-02","organization":"East Adam University","category":"suspected compromise","# events":"9"},
  {"observation time":"2026-02","organization":"East Angelaberg University","category":"suspected compromise","# events":"26"},
  {"observation time":"2026-02","organization":"East Anitafurt University","category":"suspected compromise","# events":"9"},
  {"observation time":"2026-02","organization":"East Brittanystad University","category":"suspected compromise","# events":"5"},
  {"observation time":"2026-02","organization":"East Bryceport University","category":"suspected compromise","# events":"106"},
  {"observation time":"2026-02","organization":"East Paul University","category":"public exposure","# events":"5"},
  {"observation time":"2026-02","organization":"East Richard University","category":"suspected compromise","# events":"5"},
  {"observation time":"2026-02","organization":"East Whitneyshire University","category":"suspected compromise","# events":"133"},
  {"observation time":"2026-02","organization":"Edwardville University","category":"public exposure","# events":"4"},
  {"observation time":"2026-02","organization":"Edwardville University","category":"suspected compromise","# events":"8"},
  {"observation time":"2026-02","organization":"Friedmanmouth University","category":"suspected compromise","# events":"102"},
  {"observation time":"2026-02","organization":"Glennton University","category":"public exposure","# events":"3"},
  {"observation time":"2026-02","organization":"Glennton University","category":"suspected compromise","# events":"129"},
  {"observation time":"2026-02","organization":"Hannamouth University","category":"public exposure","# events":"5"},
  {"observation time":"2026-02","organization":"Hineschester University","category":"suspected compromise","# events":"1"},
  {"observation time":"2026-02","organization":"Hunterborough University","category":"public exposure","# events":"2"},
  {"observation time":"2026-02","organization":"Jimmyfurt University","category":"suspected compromise","# events":"19"},
  {"observation time":"2026-02","organization":"Lake Ashleyburgh University","category":"suspected compromise","# events":"168"},
  {"observation time":"2026-02","organization":"Lake Brianberg University","category":"suspected compromise","# events":"4"},
  {"observation time":"2026-02","organization":"Lake Davidmouth University","category":"public exposure","# events":"6"},
  {"observation time":"2026-02","organization":"Lake Ernestberg University","category":"suspected compromise","# events":"2"},
  {"observation time":"2026-02","organization":"Lake James University","category":"suspected compromise","# events":"7"},
  {"observation time":"2026-02","organization":"Lake Jennifermouth University","category":"suspected compromise","# events":"2"},
  {"observation time":"2026-02","organization":"Lake Kelsey University","category":"suspected compromise","# events":"1"},
  {"observation time":"2026-02","organization":"Lake Kurtmouth University","category":"suspected compromise","# events":"152"},
  {"observation time":"2026-02","organization":"Lake Sarahfurt University","category":"suspected compromise","# events":"8"},
  {"observation time":"2026-02","organization":"Lambfurt University","category":"public exposure","# events":"2"},
  {"observation time":"2026-02","organization":"Laurenberg University","category":"suspected compromise","# events":"2"},
  {"observation time":"2026-02","organization":"Matthewside University","category":"suspected compromise","# events":"2"},
];

// ── Types ──
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface OrgData {
  name: string;
  publicExposure: number;
  suspectedCompromise: number;
  total: number;
  riskLevel: RiskLevel;
}

function getRiskLevel(total: number): RiskLevel {
  if (total === 0) return 'Low';
  if (total <= 10) return 'Low';
  if (total <= 100) return 'Medium';
  if (total <= 200) return 'High';
  return 'Critical';
}

const RISK_COLORS: Record<RiskLevel, string> = {
  Low: 'hsl(142 71% 45%)',
  Medium: 'hsl(48 96% 53%)',
  High: 'hsl(25 95% 53%)',
  Critical: 'hsl(0 84% 60%)',
};

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  Low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function getEventBadgeClass(count: number): string {
  if (count === 0) return 'bg-muted text-muted-foreground';
  if (count <= 10) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (count <= 100) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

type SortKey = 'name' | 'publicExposure' | 'suspectedCompromise' | 'total';

export function ArcticSecurityDashboard() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortAsc, setSortAsc] = useState(false);

  // ── Aggregate data ──
  const orgData = useMemo<OrgData[]>(() => {
    const map = new Map<string, { pe: number; sc: number }>();
    for (const row of RAW_DATA) {
      const existing = map.get(row.organization) || { pe: 0, sc: 0 };
      const events = parseInt(row['# events'], 10);
      if (row.category === 'public exposure') existing.pe += events;
      else existing.sc += events;
      map.set(row.organization, existing);
    }
    return Array.from(map.entries()).map(([name, { pe, sc }]) => {
      const total = pe + sc;
      return { name, publicExposure: pe, suspectedCompromise: sc, total, riskLevel: getRiskLevel(total) };
    });
  }, []);

  // ── Summary stats ──
  const totalOrgs = orgData.length;
  const totalCompromise = orgData.reduce((s, o) => s + o.suspectedCompromise, 0);
  const totalExposure = orgData.reduce((s, o) => s + o.publicExposure, 0);

  // ── Filtered & sorted table data ──
  const filteredData = useMemo(() => {
    let data = orgData;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(o => o.name.toLowerCase().includes(q));
    }
    data = [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return data;
  }, [orgData, search, sortKey, sortAsc]);

  // ── Top 10 for bar chart ──
  const top10 = useMemo(() =>
    [...orgData].sort((a, b) => b.total - a.total).slice(0, 10).map(o => ({
      name: o.name.replace(' University', ''),
      'Suspected Compromise': o.suspectedCompromise,
      'Public Exposure': o.publicExposure,
    })),
    [orgData]
  );

  // ── Risk tier distribution ──
  const riskDistribution = useMemo(() => {
    const counts: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    orgData.forEach(o => counts[o.riskLevel]++);
    return (['Critical', 'High', 'Medium', 'Low'] as RiskLevel[])
      .map(level => ({ name: level, value: counts[level], color: RISK_COLORS[level] }))
      .filter(d => d.value > 0);
  }, [orgData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const chartConfig = {
    'Suspected Compromise': { label: 'Suspected Compromise', color: 'hsl(0 84% 60%)' },
    'Public Exposure': { label: 'Public Exposure', color: 'hsl(48 96% 53%)' },
  };

  const riskChartConfig = riskDistribution.reduce((acc, d) => {
    acc[d.name] = { label: d.name, color: d.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <img src={arcticLogo} alt="Arctic" className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Arctic Security Scan</h2>
            <p className="text-sm text-muted-foreground">Security scanning results for member institutions</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
          <Shield className="h-3 w-3" />
          Last Scan: February 2026
        </Badge>
      </div>

      {/* Member Portal Visibility Toggle */}
      <MemberVisibilityToggle />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organizations Scanned</p>
                <p className="text-3xl font-bold text-foreground">{totalOrgs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suspected Compromises</p>
                <p className="text-3xl font-bold text-foreground">{totalCompromise.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Eye className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Public Exposures</p>
                <p className="text-3xl font-bold text-foreground">{totalExposure.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top 10 Organizations by Event Count</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <BarChart data={top10} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="Suspected Compromise" stackId="a" fill="hsl(0 84% 60%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Public Exposure" stackId="a" fill="hsl(48 96% 53%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Risk Tier Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Level Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ChartContainer config={riskChartConfig} className="h-[200px] w-[200px]">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {riskDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {riskDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-sm">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-semibold text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">All Organizations</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="gap-1 -ml-3 font-medium" onClick={() => handleSort('name')}>
                      Organization <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1 font-medium" onClick={() => handleSort('publicExposure')}>
                      Public Exposure <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1 font-medium" onClick={() => handleSort('suspectedCompromise')}>
                      Suspected Compromise <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1 font-medium" onClick={() => handleSort('total')}>
                      Total <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(org => (
                  <TableRow key={org.name}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={getEventBadgeClass(org.publicExposure)}>
                        {org.publicExposure}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={getEventBadgeClass(org.suspectedCompromise)}>
                        {org.suspectedCompromise}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{org.total}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={RISK_BADGE_CLASSES[org.riskLevel]}>
                        {org.riskLevel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No organizations found matching "{search}"
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
