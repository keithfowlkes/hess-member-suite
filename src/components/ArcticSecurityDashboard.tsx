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
import { Search, Shield, AlertTriangle, Eye, Building2, ArrowUpDown, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import arcticLogo from '@/assets/arctic-logo.png';
import { ArcticPricingRequestsPanel } from '@/components/ArcticPricingRequestsPanel';
import { useArcticScanData, useRefreshArcticScanData } from '@/hooks/useArcticScanData';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MemberArcticSecurityView,
  URGENCY_ORDER,
  URGENCY_LABELS,
  URGENCY_COLORS,
  URGENCY_BADGE_CLASSES,
  normalizeUrgency,
  formatFullDate,
  type UrgencyLevel,
} from '@/components/MemberArcticSecurityView';



// ── Types ──
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface OrgData {
  name: string;
  publicExposure: number;
  knownVulnerabilities: number;
  suspectedCompromise: number;
  total: number;
  riskLevel: RiskLevel;
  urgency: Record<UrgencyLevel, number>;
  topUrgency: UrgencyLevel;
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

function formatPeriod(period?: string | null): string {
  if (!period) return 'Not available';
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatSyncTime(value?: string | null): string {
  if (!value) return 'never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'never';
  return date.toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

type SortKey =
  | 'name'
  | 'publicExposure'
  | 'knownVulnerabilities'
  | 'suspectedCompromise'
  | 'total'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export function ArcticSecurityDashboard() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrg, setPreviewOrg] = useState<string>('');
  const { data: scanData, isLoading: scanLoading } = useArcticScanData();
  const refreshArcticData = useRefreshArcticScanData();
  const [refreshing, setRefreshing] = useState(false);
  const RAW_DATA = scanData?.rows ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshArcticData();
      toast.success('Arctic scan data refreshed');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to refresh Arctic scan data');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Aggregate data ──
  const orgData = useMemo<OrgData[]>(() => {
    type Acc = { pe: number; kv: number; sc: number; urgency: Record<UrgencyLevel, number> };
    const map = new Map<string, Acc>();
    for (const row of RAW_DATA) {
      const existing: Acc = map.get(row.organization) || {
        pe: 0, kv: 0, sc: 0,
        urgency: { critical: 0, high: 0, medium: 0, low: 0 },
      };
      const events = parseInt(row['# events'], 10) || 0;
      if (row.category === 'public exposure') existing.pe += events;
      else if (row.category === 'known vulnerabilities') existing.kv += events;
      else existing.sc += events;
      existing.urgency[normalizeUrgency(row.urgency)] += events;
      map.set(row.organization, existing);
    }
    return Array.from(map.entries()).map(([name, { pe, kv, sc, urgency }]) => {
      const total = pe + kv + sc;
      const topUrgency = URGENCY_ORDER.find(l => urgency[l] > 0) ?? 'low';
      return {
        name,
        publicExposure: pe,
        knownVulnerabilities: kv,
        suspectedCompromise: sc,
        total,
        riskLevel: getRiskLevel(total),
        urgency,
        topUrgency,
      };
    });
  }, [RAW_DATA]);

  // ── Urgency totals across the consortium ──
  const urgencyTotals = useMemo(() => {
    const totals: Record<UrgencyLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const o of orgData) {
      for (const level of URGENCY_ORDER) totals[level] += o.urgency[level];
    }
    return totals;
  }, [orgData]);

  const urgencyDistribution = useMemo(
    () => URGENCY_ORDER
      .map(level => ({ name: URGENCY_LABELS[level], value: urgencyTotals[level], color: URGENCY_COLORS[level] }))
      .filter(d => d.value > 0),
    [urgencyTotals]
  );

  const urgencyChartConfig = urgencyDistribution.reduce((acc, d) => {
    acc[d.name] = { label: d.name, color: d.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

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
    const valueOf = (o: OrgData) =>
      (['critical', 'high', 'medium', 'low'] as string[]).includes(sortKey)
        ? o.urgency[sortKey as UrgencyLevel]
        : (o[sortKey as keyof OrgData] as string | number);
    data = [...data].sort((a, b) => {
      const av = valueOf(a), bv = valueOf(b);
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
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={refreshing || scanLoading}
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh data
          </Button>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
              <Shield className="h-3 w-3" />
              {scanLoading
                ? 'Loading scan data…'
                : `Last Scan Loaded: ${formatFullDate(scanData?.lastSyncAt)}`}
            </Badge>
            {!scanLoading && (
              <span className="text-[11px] text-muted-foreground">
                Refreshes every 2 hours
              </span>
            )}
          </div>
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

      <ArcticPricingRequestsPanel />

      {!scanLoading && orgData.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No Arctic Security scan data is available yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              The feed syncs automatically every 2 hours. Use "Refresh data" above to pull the latest results now.
            </p>
          </CardContent>
        </Card>
      )}


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

      {/* Urgency summary strip (reported by the Arctic feed) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Events by Urgency (Arctic feed)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {URGENCY_ORDER.map(level => (
              <div
                key={level}
                className="rounded-lg border p-3"
                style={{ borderLeftWidth: 4, borderLeftColor: URGENCY_COLORS[level] }}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {URGENCY_LABELS[level]} urgency
                </p>
                <p className="text-2xl font-bold text-foreground">{urgencyTotals[level].toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">
                  {orgData.filter(o => o.urgency[level] > 0).length} institutions affected
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

        {/* Urgency Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Urgency Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ChartContainer config={urgencyChartConfig} className="h-[200px] w-[200px]">
              <PieChart>
                <Pie
                  data={urgencyDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {urgencyDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {urgencyDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-sm">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-semibold text-foreground">{d.value.toLocaleString()}</span>
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
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1 font-medium" onClick={() => handleSort('critical')}>
                      Critical <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1 font-medium" onClick={() => handleSort('high')}>
                      High <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1 font-medium" onClick={() => handleSort('medium')}>
                      Medium <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="gap-1 font-medium" onClick={() => handleSort('low')}>
                      Low <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Top Urgency</TableHead>
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
                    {URGENCY_ORDER.map(level => (
                      <TableCell key={level} className="text-center">
                        {org.urgency[level] > 0 ? (
                          <span className="font-medium">{org.urgency[level].toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={URGENCY_BADGE_CLASSES[org.topUrgency]}>
                        {URGENCY_LABELS[org.topUrgency]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={RISK_BADGE_CLASSES[org.riskLevel]}>
                        {org.riskLevel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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
