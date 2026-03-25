import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { Shield, AlertTriangle, Eye, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// ── Same raw sample data as admin dashboard ──
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
  {"observation time":"2026-02","organization":"HESS Consortium Administrator","category":"public exposure","# events":"3"},
  {"observation time":"2026-02","organization":"HESS Consortium Administrator","category":"suspected compromise","# events":"12"},
];

type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

function getRiskLevel(total: number): RiskLevel {
  if (total <= 10) return 'Low';
  if (total <= 100) return 'Medium';
  if (total <= 200) return 'High';
  return 'Critical';
}

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  Low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
const RISK_COLORS: Record<RiskLevel, string> = {
  Low: 'hsl(142 71% 45%)',
  Medium: 'hsl(48 96% 53%)',
  High: 'hsl(25 95% 53%)',
  Critical: 'hsl(0 84% 60%)',
};

const CATEGORY_COLORS = {
  'Suspected Compromise': 'hsl(0 84% 60%)',
  'Public Exposure': 'hsl(48 96% 53%)',
};

export function MemberArcticSecurityView() {
  const { user } = useAuth();

  // Fetch the logged-in user's organization name
  const { data: userOrg } = useQuery({
    queryKey: ['user-org-name', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization')
        .eq('user_id', user.id)
        .single();
      return profile?.organization ?? null;
    },
    enabled: !!user,
  });

  // ── Aggregate all orgs for risk distribution (no org names exposed) ──
  const orgData = useMemo(() => {
    const map = new Map<string, { pe: number; sc: number }>();
    for (const row of RAW_DATA) {
      const existing = map.get(row.organization) || { pe: 0, sc: 0 };
      const events = parseInt(row['# events'], 10);
      if (row.category === 'public exposure') existing.pe += events;
      else existing.sc += events;
      map.set(row.organization, existing);
    }
    return Array.from(map.entries()).map(([, { pe, sc }]) => {
      const total = pe + sc;
      return { total, riskLevel: getRiskLevel(total) };
    });
  }, []);

  const riskDistribution = useMemo(() => {
    const counts: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    orgData.forEach(o => counts[o.riskLevel]++);
    return (['Critical', 'High', 'Medium', 'Low'] as RiskLevel[])
      .map(level => ({ name: level, value: counts[level], color: RISK_COLORS[level] }))
      .filter(d => d.value > 0);
  }, [orgData]);

  const riskChartConfig = riskDistribution.reduce((acc, d) => {
    acc[d.name] = { label: d.name, color: d.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);
  // ── Organization-specific data ──
  const myOrgData = useMemo(() => {
    if (!userOrg) return null;
    const orgRows = RAW_DATA.filter(
      r => r.organization.toLowerCase() === userOrg.toLowerCase()
    );
    if (orgRows.length === 0) return null;

    let publicExposure = 0;
    let suspectedCompromise = 0;
    const lastScan = orgRows[0]['observation time'];

    for (const row of orgRows) {
      const events = parseInt(row['# events'], 10);
      if (row.category === 'public exposure') publicExposure += events;
      else suspectedCompromise += events;
    }

    const total = publicExposure + suspectedCompromise;
    return {
      name: orgRows[0].organization,
      lastScan,
      publicExposure,
      suspectedCompromise,
      total,
      riskLevel: getRiskLevel(total),
      categories: orgRows.map(r => ({
        category: r.category,
        events: parseInt(r['# events'], 10),
      })),
    };
  }, [userOrg]);

  const orgPieData = useMemo(() => {
    if (!myOrgData) return [];
    return [
      { name: 'Suspected Compromise', value: myOrgData.suspectedCompromise, color: CATEGORY_COLORS['Suspected Compromise'] },
      { name: 'Public Exposure', value: myOrgData.publicExposure, color: CATEGORY_COLORS['Public Exposure'] },
    ].filter(d => d.value > 0);
  }, [myOrgData]);

  const orgChartConfig = orgPieData.reduce((acc, d) => {
    acc[d.name] = { label: d.name, color: d.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Organization-Specific Section — LEFT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Your Organization's Security Scan
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This data is private to your institution only
          </p>
        </CardHeader>
        <CardContent>
          {!myOrgData ? (
            <div className="text-center py-8">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                No Arctic Security scan data found for your organization
                {userOrg ? ` (${userOrg})` : ''}.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Data will appear here once your institution has been included in an Arctic Security scan.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Org header info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border bg-muted/30">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Organization</p>
                    <p className="text-lg font-semibold text-foreground mt-1">{myOrgData.name}</p>
                  </CardContent>
                </Card>
                <Card className="border bg-muted/30">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Scan</p>
                    <p className="text-lg font-semibold text-foreground mt-1">
                      {myOrgData.lastScan === '2026-02' ? 'February 2026' : myOrgData.lastScan}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border bg-muted/30">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Risk Level</p>
                    <div className="mt-1">
                      <Badge className={RISK_BADGE_CLASSES[myOrgData.riskLevel]}>
                        {myOrgData.riskLevel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category breakdown table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myOrgData.categories.map((cat, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium capitalize">{cat.category}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className={
                              cat.events > 100
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : cat.events > 10
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }
                          >
                            {cat.events.toLocaleString()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">{myOrgData.total.toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Org pie chart */}
              {orgPieData.length > 0 && (
                <div className="flex flex-col items-center">
                  <ChartContainer config={orgChartConfig} className="h-[180px] w-[180px]">
                    <PieChart>
                      <Pie
                        data={orgPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {orgPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="flex gap-4 mt-3">
                    {orgPieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-sm">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold text-foreground">{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Overview — RIGHT, visible to all members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Consortium-Wide Security Overview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggregate event totals across all scanned institutions (no institution-specific data shown)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Suspected Compromises</p>
                  <p className="text-2xl font-bold text-foreground">{allAggregated.totalSC.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Eye className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Public Exposures</p>
                  <p className="text-2xl font-bold text-foreground">{allAggregated.totalPE.toLocaleString()}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
                <Shield className="h-3 w-3" />
                Last Scan: February 2026
              </Badge>
            </div>

            <div className="flex flex-col items-center">
              <ChartContainer config={overviewChartConfig} className="h-[200px] w-[200px]">
                <PieChart>
                  <Pie
                    data={overviewPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {overviewPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="flex gap-4 mt-3">
                {overviewPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-sm">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold text-foreground">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
