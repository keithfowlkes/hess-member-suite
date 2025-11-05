import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Building2 } from 'lucide-react';

interface OrgSystemData {
  name: string;
  student_fte: number;
  student_information_system: string;
  financial_system: string;
  hcm_hr: string;
}

const SYSTEM_COLORS = {
  sis: 'hsl(var(--chart-1))',
  financial: 'hsl(var(--chart-2))',
  hcm: 'hsl(var(--chart-3))',
};

export const OrganizationSizeCorrelation = () => {
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

  // Prepare data for scatter plot - create separate series for each system type
  const sisData = organizations.map((org, idx) => ({
    x: idx + 1,
    y: org.student_fte,
    name: org.name,
    system: org.student_information_system || 'Not specified',
    type: 'Student Information System',
  }));

  const financialData = organizations.map((org, idx) => ({
    x: idx + 1,
    y: org.student_fte,
    name: org.name,
    system: org.financial_system || 'Not specified',
    type: 'Financial System',
  }));

  const hcmData = organizations.map((org, idx) => ({
    x: idx + 1,
    y: org.student_fte,
    name: org.name,
    system: org.hcm_hr || 'Not specified',
    type: 'HCM System',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-xs text-muted-foreground mt-1">Student FTE: {data.y.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{data.type}: {data.system}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Organization Size & System Preferences</CardTitle>
            <CardDescription className="mt-1.5">
              Correlation between institution size and technology system choices
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
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
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Scatter
              name="Student Information System"
              data={sisData}
              fill={SYSTEM_COLORS.sis}
              opacity={0.6}
            />
            <Scatter
              name="Financial System"
              data={financialData}
              fill={SYSTEM_COLORS.financial}
              opacity={0.6}
            />
            <Scatter
              name="HCM System"
              data={hcmData}
              fill={SYSTEM_COLORS.hcm}
              opacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-4 text-xs text-muted-foreground">
          Each point represents an institution. Hover to see details about their system choices.
        </div>
      </CardContent>
    </Card>
  );
};
