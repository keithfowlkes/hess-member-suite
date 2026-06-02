import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import { Shield, Lock, HelpCircle, ChevronDown } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import arcticLogo from '@/assets/arctic-logo.png';

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

const RISK_DESCRIPTIONS: Record<RiskLevel, string> = {
  Low: 'Low risk (≤10 events): minimal observed activity; routine monitoring recommended.',
  Medium: 'Medium risk (11–100 events): moderate activity; review and investigate suspicious entries.',
  High: 'High risk (101–200 events): elevated activity; prompt remediation and deeper investigation advised.',
  Critical: 'Critical risk (>200 events): severe activity; immediate action and incident response recommended.',
};

const RiskTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const level = item.name as RiskLevel;
  return (
    <div className="rounded-md border bg-background p-3 shadow-md max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <span className="font-semibold text-foreground">{level}</span>
        <span className="text-muted-foreground text-sm">({item.value} {item.value === 1 ? 'event' : 'events'})</span>
      </div>
      <p className="text-xs text-muted-foreground">{RISK_DESCRIPTIONS[level]}</p>
    </div>
  );
};

export function MemberArcticSecurityView() {
  const { user } = useAuth();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const threatCategories = [
    { category: 'suspected compromise', domain: 'incident response', description: 'This category of information details specific recipient assets, which have been observed by a third party to be compromised.' },
    { category: 'known vulnerabilities', domain: 'vulnerability management', description: 'This category of information details technical vulnerabilities, which at present are often enumerated through Common Vulnerabilities and Exposures and which warrant a fix to be deployed to address them.' },
    { category: 'public exposure', domain: 'configuration management', description: 'This category of information details services or ports which are publicly exposed to the Internet.' },
    { category: 'potential threats', domain: 'threat analysis or risk assessment', description: 'This category of information enumerates observations, which can cause harm to the affected organization, such as a service being blocked by third parties, but are not specific enough to attribute the harm without further analysis.' },
  ];

  const threatTypes = [
    { type: 'compromised account', description: 'Observations on leaked user credentials, which have been taken from a compromised online service.', impact: 'In addition to posing a risk to the breached service, other services used by the same user are at risk due to the common practice of password reuse.' },
    { type: 'compromised server', description: 'This type of observation details a server or service has been compromised by a third party.', impact: 'These hosts or services are under threat actor control to do their bidding.' },
    { type: 'ddos bot', description: 'These hosts have been observed to participate in DDoS attacks and are likely to have been compromised.', impact: 'These hosts are likely to have been infected by a piece of malware and are controlled by threat actors.' },
    { type: 'ddos potential', description: 'These observations refer to misconfigured network services, which are vulnerable to DDoS reflection often over UDP.', impact: 'Even if this vulnerability does not directly affect the confidentiality or integrity of the host in question, the resource or upstream bandwidth consumption can affect availability.' },
    { type: 'ddos reflector', description: 'These hosts or services have been observed to participate in DDoS attacks even if they have not necessarily been compromised. They may for example offer a UDP-based vulnerable service, which has been spoofed to facilitate a reflected attack against a third party.', impact: 'Participating in the DDoS attack may consume your upstream bandwidth during the attack or the uplink may become unavailable due to various DDoS countermeasures.' },
    { type: 'ddos target', description: 'This observation type refers to an intended target of a DDoS attack.', impact: 'A host or service may have been subjected to DDoS traffic, which may have impacted operations.' },
    { type: 'defacement', description: 'This type of observation refers to digital vandalism, which on a technical level is indicative of suspected compromise.', impact: 'This host is likely to have been compromised by a third party and very often is used for other criminal activities as well.' },
    { type: 'dropzone', description: 'This type of observation refers to a resource which is used to store stolen user data.', impact: 'Personally identifiable information is often stored unlawfully on these hosts or services.' },
    { type: 'exploitation', description: 'This type of observation refers to hosts attempting to exploit a vulnerable service on a third party system.', impact: 'These hosts are likely to have been compromised and are trying to break into other hosts or services.' },
    { type: 'exploit url', description: 'This type of observation details an exploit kit, which served through a malicious URL.', impact: 'These URLs are used by the threat actors as a mechanism to break into vulnerable machines.' },
    { type: 'exposed service', description: 'These observations relate to network services, which should not be directly exposed to the Internet.', impact: 'The implementations of these types of services have not been designed with the needs of the Internet in mind and can often be trivially compromised. A good example of this type of service is RDP.' },
    { type: 'malware configuration', description: 'These observations point to resources which update malware infected machines with new instructions.', impact: 'A malware configuration site functions as part of a botnet and the host in question is often compromised.' },
    { type: 'malware infection', description: 'This type of observation details hosts which have been observed to call out to a command and control server.', impact: 'These hosts are likely to have been infected by a piece of malware and are controlled by threat actors.' },
    { type: 'malware url', description: 'An observation referencing a malware URL is the most common resource associated with malware distribution.', impact: 'These hosts are serving pieces of malware to infect new machines and are often compromised by threat actors.' },
    { type: 'open port', description: 'These types of observations relate to hosts which expose specific ports to the Internet, but the observations do not specify the exact service in question.', impact: 'Open ports, which do have a service responding to requests from anyone will increase the attack surface of a given organization.' },
    { type: 'open service', description: 'This type refers to network services, which are publicly exposed to the Internet. This may be intentional or the result of a misconfiguration.', impact: 'Even if scanning for this service has not identified a specific vulnerability, unintentionally exposed network services increase the attack surface and may lead to compromise. A good example of this type of service is FTP.' },
    { type: 'phishing', description: 'This observation type most often refers to a URL or domain name used to defraud the users of their credentials.', impact: 'These URLs or domain names are served to potential victims to try to steal their credentials to a third party service. These hosts are often also compromised by threat actors.' },
    { type: 'ransomware', description: 'This observation type refers to a specific type of suspected compromise, where the host has been hijacked for ransom by the criminals.', impact: 'The network shares, local storage and databases of these hosts are encrypted by the criminals for ransom or sabotage. This in turn, may lead to encryption of storage resources for an entire organization.' },
    { type: 'scanner', description: 'This observation type refers to machines which are performing port or vulnerability scanning attempts in general.', impact: 'These hosts are scanning for vulnerable services to make it possible for threat actors to compromise them. The hosts doing the scanning are often compromised or infected as well.' },
    { type: 'spam infrastructure', description: "These observations detail resources which make up a spammer's infrastructure, be it a harvester, dictionary attacker, URL, spam etc.", impact: 'These hosts will most likely be blocked because they are participating in spamming activities.' },
    { type: 'test', description: 'Used for testing purposes.', impact: 'These observations can be used to test an early warning service for example, without impacting the functionality of the service.' },
    { type: 'vulnerable service', description: 'These observations refer to specific technical vulnerabilities present on a network service, which usually have been assigned a CVE by MITRE.', impact: 'The CVE assigned to the vulnerability affects the host in various ways. The CIA triad and CVSS score are metrics, which detail the severity of the vulnerability. Remote code execution is a good example of a severe impact.' },
    { type: 'weak encryption', description: 'These types of observations relate to network services which expose a specific weakness in encryption.', impact: 'According to OWASP, incorrect uses of encryption may result in sensitive data exposure, key leakage, broken authentication, insecure session, and spoofing attacks.' },
  ];

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

  // Organization-specific risk-level distribution (events grouped by risk level per category)
  const orgRiskDistribution = useMemo(() => {
    if (!myOrgData) return [];
    const counts: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    for (const cat of myOrgData.categories) {
      const level = getRiskLevel(cat.events);
      counts[level] += cat.events;
    }
    return (['Critical', 'High', 'Medium', 'Low'] as RiskLevel[])
      .map(level => ({ name: level, value: counts[level], color: RISK_COLORS[level] }))
      .filter(d => d.value > 0);
  }, [myOrgData]);

  const orgRiskChartConfig = orgRiskDistribution.reduce((acc, d) => {
    acc[d.name] = { label: d.name, color: d.color };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization-Specific Section — LEFT */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
             Your Organization's Security Scan
             <Popover>
               <PopoverTrigger asChild>
                 <button className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors">
                   <HelpCircle className="h-4 w-4 text-muted-foreground" />
                 </button>
               </PopoverTrigger>
               <PopoverContent className="max-w-sm text-sm">
                 This information is provided to HESS members as a basic "heads-up" for possible cybersecurity threats. For additional information, read the "About Arctic Security" information below on how to get detail information through their services at the HESS member discount.
               </PopoverContent>
             </Popover>
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
              {/* Org summary row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Organization: </span>
                  <span className="font-semibold text-foreground">{myOrgData.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Scan: </span>
                  <span className="font-semibold text-foreground">
                    {myOrgData.lastScan === '2026-02' ? 'February 2026' : myOrgData.lastScan}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Risk Level: </span>
                  <Badge className={RISK_BADGE_CLASSES[myOrgData.riskLevel]}>
                    {myOrgData.riskLevel}
                  </Badge>
                </div>
              </div>

              {/* Table + pie side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
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
                  <div className="flex flex-col items-center justify-center">
                    <ChartContainer config={orgChartConfig} className="h-[150px] w-[150px]">
                      <PieChart>
                        <Pie
                          data={orgPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={3}
                        >
                          {orgPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                      {orgPieData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="font-semibold text-foreground">{d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground/70 italic mt-4">Your information here is confidential and specific to your HESS member institution.</p>
        </CardContent>
      </Card>

      {/* Organization-Specific Risk Level Distribution — RIGHT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Your Risk Level Distribution
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Risk level distribution of observed events for your organization (hover slices for threat level details)
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {orgRiskDistribution.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">
                No risk distribution data available for your organization.
              </p>
            </div>
          ) : (
            <>
              <ChartContainer config={orgRiskChartConfig} className="h-[220px] w-[220px]">
                <PieChart>
                  <Pie
                    data={orgRiskDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {orgRiskDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<RiskTooltip />} />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {orgRiskDistribution.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-sm">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold text-foreground">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1 mt-4">
                <Shield className="h-3 w-3" />
                Last Scan: February 2026
              </Badge>
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {/* About Arctic Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <img src={arcticLogo} alt="Arctic" className="h-4 w-4" />
            About Arctic Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Arctic EWS matches global cybersecurity observations to your organization and turns them into ready-to-use notifications. It handles threat types such as compromised machines and remotely exploitable services that act as publicly accessible weak points in your network. Arctic EWS notifications reveal the immediate security issues in your organization's network. Enhance your security by increasing the visibility of cybersecurity issues such as data breaches that could damage your operations. Instead of reacting to issues, anticipate them using high-quality information: fix problems before they cause harm.
          </p>

          <button
            onClick={() => setAboutOpen(!aboutOpen)}
            className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-foreground">
              Examples of different categories of data that are available through the service
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${aboutOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {aboutOpen && (
            <div className="space-y-4">
              <ul className="list-disc list-inside space-y-1">
                <li>Compromised systems — Infected hosts (e.g. bots communicating with sinkholes)</li>
                <li>Botnet infrastructure (e.g. command and control)</li>
                <li>Compromised systems that are serving malware</li>
                <li>Attacking IPs (Systems in your network attacking others)</li>
                <li>Sources of spam and phishing</li>
                <li>Defacements</li>
              </ul>
              <div>
                <p className="font-medium text-foreground mb-2">Available EWS notification types</p>
                <p className="font-medium text-foreground mt-3 mb-1">Vulnerable Systems</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Services and systems with known vulnerabilities</li>
                  <li>Services that enable use of weak crypto algorithms</li>
                  <li>Services with expired x509 certificates</li>
                  <li>Services facilitating amplification (DDOS) attacks</li>
                  <li>Misconfigured servers</li>
                </ul>
                <p className="font-medium text-foreground mt-3 mb-1">Open services</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Open database servers</li>
                  <li>Open VPN and VNC servers</li>
                  <li>Services that should not be exposed to internet</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Leaked Data Service Description</p>
                <p>The following notifications are available as optional additions to Arctic Early Warning Service:</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Compromised Credentials</p>
                <p>This dataset contains compromised usernames and passwords that have been observed in data dumps or by investigating malware stealer logs. Based on the collection method, this dataset contains currently the following content:</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Leaked Credentials</p>
                <p>Leaked credentials report credentials that have been leaked in a data breach and shared publicly on the internet. The credentials are identified by the customer's email domains. The data source contains usernames, leaked or reversed plaintext passwords or hashed passwords that have been leaked in data breaches, along with information about the data breach in which each entry has been leaked. Users will initially receive all historical entries for their domains. After the initial batch, they will continue to be informed about new findings.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Stolen Credentials</p>
                <p>Stolen credentials notify users about stolen credentials associated with their email domains. These observations indicate that a compromised client device has been used when logging in by using the reported credentials.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Stolen Sessions</p>
                <p>Stolen sessions are about session cookies associated with the monitored domain names. A stolen session cookie indicates that a compromised client device has been used when accessing a service within the monitored domain.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Dark Web Data</p>
                <p>Dark Web Data dataset contains data associated with the domain name of the user's organization. The reported data is leaked or stolen and published either in the dark web or in a download service. This dataset contains the following data feed:</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Leaked Content</p>
                <p>The feed provides links to leaked data content. The recipient should review the content with caution to assess its significance. Content may vary but a typical scenario is ransomware extortion, where the linked data is at risk of being published.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threat Category Definitions */}
      <Card>
        <CardHeader className="pb-3">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <CardTitle className="text-base">Threat Category Definitions</CardTitle>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`} />
          </button>
        </CardHeader>
        {categoryOpen && (
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Category</th>
                    <th className="px-4 py-2 text-left font-semibold">Domain</th>
                    <th className="px-4 py-2 text-left font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {threatCategories.map((row, i) => (
                    <tr key={row.category} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="px-4 py-2 align-top font-medium whitespace-nowrap">{row.category}</td>
                      <td className="px-4 py-2 align-top whitespace-nowrap">{row.domain}</td>
                      <td className="px-4 py-2 align-top text-muted-foreground">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Threat Type Definitions */}
      <Card>
        <CardHeader className="pb-3">
          <button
            onClick={() => setTypeOpen(!typeOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <CardTitle className="text-base">Threat Type Definitions</CardTitle>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${typeOpen ? 'rotate-180' : ''}`} />
          </button>
        </CardHeader>
        {typeOpen && (
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Type</th>
                    <th className="px-4 py-2 text-left font-semibold">Description</th>
                    <th className="px-4 py-2 text-left font-semibold">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {threatTypes.map((row, i) => (
                    <tr key={row.type} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="px-4 py-2 align-top font-medium whitespace-nowrap">{row.type}</td>
                      <td className="px-4 py-2 align-top text-muted-foreground">{row.description}</td>
                      <td className="px-4 py-2 align-top text-muted-foreground">{row.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
