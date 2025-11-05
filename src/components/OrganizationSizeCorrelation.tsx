import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Building2, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';

interface OrgSystemData {
  name: string;
  student_fte: number;
  student_information_system: string;
  financial_system: string;
  hcm_hr: string;
}

// Dynamic color palette for different systems
const generateSystemColor = (systemName: string, index: number) => {
  const colors = [
    'hsl(220, 90%, 56%)',   // Blue
    'hsl(340, 75%, 55%)',   // Red
    'hsl(142, 71%, 45%)',   // Green
    'hsl(262, 83%, 58%)',   // Purple
    'hsl(24, 90%, 53%)',    // Orange
    'hsl(188, 86%, 45%)',   // Cyan
    'hsl(48, 96%, 53%)',    // Yellow
    'hsl(280, 67%, 55%)',   // Magenta
    'hsl(168, 76%, 42%)',   // Teal
    'hsl(14, 80%, 50%)',    // Coral
    'hsl(199, 89%, 48%)',   // Sky Blue
    'hsl(320, 85%, 48%)',   // Pink
  ];
  
  // Generate consistent color based on system name hash
  let hash = 0;
  for (let i = 0; i < systemName.length; i++) {
    hash = systemName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export const OrganizationSizeCorrelation = () => {
  const [selectedSystem, setSelectedSystem] = useState<'all' | 'sis' | 'financial' | 'hcm'>('all');
  const [highlightedVendor, setHighlightedVendor] = useState<string | null>(null);

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organization-size-correlation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, student_fte, student_information_system, financial_system, hcm_hr')
        .eq('membership_status', 'active')
        .not('student_fte', 'is', null)
        .order('student_fte', { ascending: true });

      if (error) throw error;
      return data as OrgSystemData[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!organizations || organizations.length === 0) {
    return null;
  }

  // Get unique systems and their colors
  const { uniqueSystems, systemColors } = useMemo(() => {
    if (!organizations) return { uniqueSystems: new Set<string>(), systemColors: {} };
    
    const systems = new Set<string>();
    const colors: Record<string, string> = {};
    
    organizations.forEach((org) => {
      if (selectedSystem === 'all' || selectedSystem === 'sis') {
        const sis = org.student_information_system || 'Not specified';
        systems.add(sis);
        if (!colors[sis]) colors[sis] = generateSystemColor(sis, systems.size);
      }
      if (selectedSystem === 'all' || selectedSystem === 'financial') {
        const fin = org.financial_system || 'Not specified';
        systems.add(fin);
        if (!colors[fin]) colors[fin] = generateSystemColor(fin, systems.size);
      }
      if (selectedSystem === 'all' || selectedSystem === 'hcm') {
        const hcm = org.hcm_hr || 'Not specified';
        systems.add(hcm);
        if (!colors[hcm]) colors[hcm] = generateSystemColor(hcm, systems.size);
      }
    });
    
    return { uniqueSystems: systems, systemColors: colors };
  }, [organizations, selectedSystem]);

  // Prepare data for scatter plot
  const chartData = useMemo(() => {
    if (!organizations) return [];
    
    return organizations.map((org, idx) => {
      let systemName = '';
      let systemType = '';
      
      if (selectedSystem === 'sis' || selectedSystem === 'all') {
        systemName = org.student_information_system || 'Not specified';
        systemType = 'SIS';
      } else if (selectedSystem === 'financial') {
        systemName = org.financial_system || 'Not specified';
        systemType = 'Financial';
      } else if (selectedSystem === 'hcm') {
        systemName = org.hcm_hr || 'Not specified';
        systemType = 'HCM';
      }
      
      return {
        x: idx + 1,
        y: org.student_fte,
        name: org.name,
        system: systemName,
        systemType,
        color: systemColors[systemName],
        opacity: highlightedVendor ? (highlightedVendor === systemName ? 1 : 0.2) : 0.7,
      };
    });
  }, [organizations, selectedSystem, systemColors, highlightedVendor]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-4 min-w-[200px]">
          <p className="font-semibold text-sm mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Student FTE:</span> {data.y.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">System:</span> {data.system}
            </p>
            {selectedSystem === 'all' && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Type:</span> {data.systemType}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Get top vendors for the selected system type
  const topVendors = useMemo(() => {
    const vendorCounts = new Map<string, number>();
    chartData.forEach(item => {
      vendorCounts.set(item.system, (vendorCounts.get(item.system) || 0) + 1);
    });
    return Array.from(vendorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([vendor]) => vendor);
  }, [chartData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Organization Size & System Preferences</CardTitle>
              <CardDescription className="mt-1.5">
                Interactive correlation between institution size and technology system choices
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2">
              <Badge
                variant={selectedSystem === 'all' ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => setSelectedSystem('all')}
              >
                All Systems
              </Badge>
              <Badge
                variant={selectedSystem === 'sis' ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => setSelectedSystem('sis')}
              >
                SIS
              </Badge>
              <Badge
                variant={selectedSystem === 'financial' ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => setSelectedSystem('financial')}
              >
                Financial
              </Badge>
              <Badge
                variant={selectedSystem === 'hcm' ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => setSelectedSystem('hcm')}
              >
                HCM
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Top Vendors Legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-2">Top Vendors:</span>
          {topVendors.map((vendor) => (
            <Badge
              key={vendor}
              variant="secondary"
              className="cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: highlightedVendor === vendor ? systemColors[vendor] : 'hsl(var(--secondary))',
                color: highlightedVendor === vendor ? 'white' : 'hsl(var(--secondary-foreground))',
              }}
              onClick={() => setHighlightedVendor(highlightedVendor === vendor ? null : vendor)}
            >
              {vendor}
            </Badge>
          ))}
          {highlightedVendor && (
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() => setHighlightedVendor(null)}
            >
              Clear
            </Badge>
          )}
        </div>

        <ResponsiveContainer width="100%" height={450}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              dataKey="x"
              name="Organization"
              label={{ value: 'Organizations (ordered by size)', position: 'insideBottom', offset: -10 }}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Student FTE"
              label={{ value: 'Student FTE', angle: -90, position: 'insideLeft' }}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            <Scatter
              data={chartData}
              fill="hsl(var(--primary))"
              onClick={(data) => setHighlightedVendor(highlightedVendor === data.system ? null : data.system)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={entry.opacity}
                  className="cursor-pointer transition-all hover:opacity-100"
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span>💡 Click system type badges to filter • Click vendor badges to highlight • Hover points for details</span>
        </div>
      </CardContent>
    </Card>
  );
};
