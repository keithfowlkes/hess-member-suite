import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface OrgLMSData {
  name: string;
  student_fte: number;
  learning_management: string;
}

// Vibrant color palette for different vendors
const COLOR_PALETTE = [
  'hsl(220, 90%, 56%)',   // Blue
  'hsl(340, 75%, 55%)',   // Rose
  'hsl(142, 71%, 45%)',   // Green
  'hsl(262, 83%, 58%)',   // Purple
  'hsl(24, 90%, 53%)',    // Orange
  'hsl(188, 86%, 45%)',   // Cyan
  'hsl(291, 64%, 51%)',   // Violet
  'hsl(168, 76%, 42%)',   // Teal
  'hsl(14, 80%, 50%)',    // Coral
  'hsl(48, 96%, 53%)',    // Amber
  'hsl(199, 89%, 48%)',   // Sky
  'hsl(320, 85%, 48%)',   // Fuchsia
];

const generateVendorColor = (vendorName: string): string => {
  let hash = 0;
  for (let i = 0; i < vendorName.length; i++) {
    hash = vendorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
};

export const OrganizationSizeLMSCorrelation = () => {
  const { data: organizations, isLoading, error } = useQuery({
    queryKey: ['organization-size-lms-correlation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, student_fte, learning_management')
        .eq('membership_status', 'active')
        .not('student_fte', 'is', null)
        .not('learning_management', 'is', null)
        .order('student_fte', { ascending: true });

      if (error) throw error;
      return data as OrgLMSData[];
    },
  });

  // Build vendor list and assign Y positions
  const { vendors, vendorYPositions, vendorColors } = useMemo(() => {
    if (!organizations) return { vendors: [], vendorYPositions: {}, vendorColors: {} };
    
    const vendorSet = new Set<string>();
    
    organizations.forEach(org => {
      const vendor = org.learning_management || 'Not specified';
      vendorSet.add(vendor);
    });
    
    // Sort vendors alphabetically (case-insensitive), then reverse for top-to-bottom display
    const vendorList = Array.from(vendorSet)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .reverse();
    const positions: Record<string, number> = {};
    const colors: Record<string, string> = {};
    
    vendorList.forEach((vendor, index) => {
      positions[vendor] = index;
      colors[vendor] = generateVendorColor(vendor);
    });
    
    return { 
      vendors: vendorList, 
      vendorYPositions: positions, 
      vendorColors: colors 
    };
  }, [organizations]);

  // Prepare scatter plot data
  const chartData = useMemo(() => {
    if (!organizations) return [];
    
    return organizations
      .filter(org => org.student_fte && org.student_fte > 0)
      .map((org) => {
        const vendor = org.learning_management || 'Not specified';
        
        return {
          x: org.student_fte,
          y: vendorYPositions[vendor],
          z: 100, // Fixed size for all points
          name: org.name,
          vendor,
          color: vendorColors[vendor],
        };
      });
  }, [organizations, vendorYPositions, vendorColors]);

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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Size vs LMS Choice</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load organization data. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Size vs LMS Choice</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No organization data available to display.</p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border-2 rounded-lg shadow-xl p-4 min-w-[220px]"
             style={{ borderColor: data.color }}>
          <p className="font-bold text-base mb-2">{data.name}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
              <p className="text-sm font-medium">{data.vendor}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Size:</span> {data.x.toLocaleString()} students
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Organization Size vs LMS Choice</CardTitle>
            <CardDescription className="mt-1.5">
              Learning Management System adoption across institutions by size
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={650}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              type="number"
              dataKey="x"
              name="Student FTE"
              domain={['dataMin - 500', 'dataMax + 500']}
              label={{ 
                value: 'Institution Size (Student FTE)', 
                position: 'insideBottom', 
                offset: -15,
                style: { fill: 'hsl(var(--foreground))', fontWeight: 600 }
              }}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="LMS"
              domain={[-0.5, Math.max(vendors.length - 0.5, 0.5)]}
              ticks={vendors.map((_, idx) => idx)}
              tickFormatter={(value) => {
                const index = Math.round(value);
                return vendors[index] || '';
              }}
              label={{ 
                value: 'Learning Management System', 
                angle: -90, 
                position: 'insideLeft',
                offset: 20,
                style: { fill: 'hsl(var(--foreground))', fontWeight: 600, fontSize: 12 }
              }}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }}
              width={200}
            />
            <ZAxis type="number" dataKey="z" range={[100, 100]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '5 5', stroke: 'hsl(var(--primary))' }} />
            
            <Scatter
              data={chartData}
              fill="hsl(var(--primary))"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={0.8}
                  className="transition-opacity hover:opacity-100"
                  stroke="white"
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
          <span className="text-lg">💡</span>
          <p><strong>How to read:</strong> Each dot represents one institution. Position shows institution size (horizontal) and their chosen LMS vendor (vertical).</p>
        </div>
      </CardContent>
    </Card>
  );
};
