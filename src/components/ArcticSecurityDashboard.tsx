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
import { Search, Shield, AlertTriangle, Eye, Building2, ArrowUpDown, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import arcticLogo from '@/assets/arctic-logo.png';
import { useArcticScanData } from '@/hooks/useArcticScanData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberArcticSecurityView } from '@/components/MemberArcticSecurityView';



// ── Types ──
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface OrgData {
  name: string;
  publicExposure: number;
  knownVulnerabilities: number;
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

type SortKey = 'name' | 'publicExposure' | 'knownVulnerabilities' | 'suspectedCompromise' | 'total';

export function ArcticSecurityDashboard() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrg, setPreviewOrg] = useState<string>('');
  const { data: scanData, isLoading: scanLoading } = useArcticScanData();
  const RAW_DATA = scanData?.rows ?? [];

  // ── Aggregate data ──
  const orgData = useMemo<OrgData[]>(() => {
    const map = new Map<string, { pe: number; kv: number; sc: number }>();
    for (const row of RAW_DATA) {
      const existing = map.get(row.organization) || { pe: 0, kv: 0, sc: 0 };
      const events = parseInt(row['# events'], 10) || 0;
      if (row.category === 'public exposure') existing.pe += events;
      else if (row.category === 'known vulnerabilities') existing.kv += events;
      else existing.sc += events;
      map.set(row.organization, existing);
    }
    return Array.from(map.entries()).map(([name, { pe, kv, sc }]) => {
      const total = pe + kv + sc;
      return { name, publicExposure: pe, knownVulnerabilities: kv, suspectedCompromise: sc, total, riskLevel: getRiskLevel(total) };
    });
  }, [RAW_DATA]);

  // ── Summary stats ──
  const totalOrgs = orgData.length;
  const totalCompromise = orgData.reduce((s, o) => s + o.suspectedCompromise, 0);
  const totalExposure = orgData.reduce((s, o) => s + o.publicExposure, 0);
  const totalVulnerabilities = orgData.reduce((s, o) => s + o.knownVulnerabilities, 0);

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
      name: o.name.length > 26 ? `${o.name.slice(0, 24)}…` : o.name,
      'Suspected Compromise': o.suspectedCompromise,
      'Known Vulnerabilities': o.knownVulnerabilities,
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
    'Known Vulnerabilities': { label: 'Known Vulnerabilities', color: 'hsl(25 95% 53%)' },
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Preview member view
          </Button>
          <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
            <Shield className="h-3 w-3" />
            Last Scan: July 2026
          </Badge>
        </div>
      </div>

      {/* Member view preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Member View Preview
            </DialogTitle>
            <DialogDescription>
              This is exactly what the selected institution sees in their member portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-w-md">
              <Label className="text-sm">Preview as institution</Label>
              <Select value={previewOrg} onValueChange={setPreviewOrg}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an institution" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {orgData.map((o) => (
                    <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {previewOrg ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <MemberArcticSecurityView previewOrgName={previewOrg} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select an institution to see their member view.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Portal Visibility Toggle */}
      <MemberVisibilityToggle />


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="p-2 rounded-lg bg-orange-500/10">
                <ShieldAlert className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Known Vulnerabilities</p>
                <p className="text-3xl font-bold text-foreground">{totalVulnerabilities.toLocaleString()}</p>
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
                <Bar dataKey="Known Vulnerabilities" stackId="a" fill="hsl(25 95% 53%)" radius={[0, 0, 0, 0]} />
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
                    <Button variant="ghost" size="sm" className="gap-1 font-medium" onClick={() => handleSort('knownVulnerabilities')}>
                      Known Vulnerabilities <ArrowUpDown className="h-3 w-3" />
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
                      <Badge variant="secondary" className={getEventBadgeClass(org.knownVulnerabilities)}>
                        {org.knownVulnerabilities}
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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

function MemberVisibilityToggle() {
  const { data: setting } = useSystemSetting('arctic_scan_member_visible');
  const updateSetting = useUpdateSystemSetting();
  const isVisible = setting?.setting_value !== 'false'; // default true

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
      <Switch
        id="arctic-member-visibility"
        checked={isVisible}
        onCheckedChange={(checked) => {
          updateSetting.mutate({
            settingKey: 'arctic_scan_member_visible',
            settingValue: String(checked),
            description: 'Controls visibility of Arctic Security Scan tab in Member Portal'
          });
        }}
      />
      <Label htmlFor="arctic-member-visibility" className="text-sm cursor-pointer">
        Show Arctic Security Scan tab in Member Portal
      </Label>
    </div>
  );
}
