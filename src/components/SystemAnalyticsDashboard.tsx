import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useSystemAnalytics, SystemUsage } from '@/hooks/useSystemAnalytics';
import { PieChart as PieChartIcon, TrendingUp, BarChart3 } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

const SYSTEM_OPTIONS = [
  { key: 'all', label: 'All Systems', icon: BarChart3 },
  { key: 'studentInformationSystems', label: 'Student Information Systems', icon: PieChartIcon },
  { key: 'financialSystems', label: 'Financial Systems', icon: PieChartIcon },
  { key: 'learningManagementSystems', label: 'Learning Management Systems', icon: PieChartIcon },
  { key: 'financialAidSystems', label: 'Financial Aid Systems', icon: PieChartIcon },
  { key: 'hcmSystems', label: 'Human Capital Management', icon: PieChartIcon },
  { key: 'payrollSystems', label: 'Payroll Systems', icon: PieChartIcon },
  { key: 'housingManagementSystems', label: 'Housing Management', icon: PieChartIcon },
  { key: 'admissionsCrms', label: 'Admissions CRM', icon: PieChartIcon },
  { key: 'alumniAdvancementCrms', label: 'Alumni & Advancement CRM', icon: PieChartIcon },
];

export function SystemAnalyticsDashboard() {
  const [chartType, setChartType] = useState<'pie' | 'line'>('pie');
  const [selectedSystem, setSelectedSystem] = useState('all');
  const { data: analytics, isLoading } = useSystemAnalytics();

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            System Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const renderSystemChart = (title: string, data: SystemUsage[], key: string) => {
    if (data.length === 0) return null;

    return (
      <Card key={key} className="min-w-[320px] bg-gradient-to-br from-card to-card/50 border-2 hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-2xl font-bold text-foreground">
            {data.reduce((sum, item) => sum + item.count, 0)} institutions
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-48">
            {chartType === 'pie' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                    label={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, 'Institutions']}
                    labelFormatter={(label) => data.find(d => d.count === label)?.name || label}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={10}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 space-y-1">
            {data.slice(0, 3).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate max-w-[120px]" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <span className="font-medium text-foreground">{item.count}</span>
              </div>
            ))}
            {data.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{data.length - 3} more systems
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const systemsToShow = selectedSystem === 'all' 
    ? [
        { key: 'studentInformationSystems', title: 'Student Information Systems', data: analytics.studentInformationSystems },
        { key: 'financialSystems', title: 'Financial Systems', data: analytics.financialSystems },
        { key: 'learningManagementSystems', title: 'Learning Management Systems', data: analytics.learningManagementSystems },
        { key: 'financialAidSystems', title: 'Financial Aid Systems', data: analytics.financialAidSystems },
        { key: 'hcmSystems', title: 'Human Capital Management', data: analytics.hcmSystems },
        { key: 'payrollSystems', title: 'Payroll Systems', data: analytics.payrollSystems },
        { key: 'housingManagementSystems', title: 'Housing Management', data: analytics.housingManagementSystems },
        { key: 'admissionsCrms', title: 'Admissions CRM', data: analytics.admissionsCrms },
        { key: 'alumniAdvancementCrms', title: 'Alumni & Advancement CRM', data: analytics.alumniAdvancementCrms },
      ]
    : [
        {
          key: selectedSystem,
          title: SYSTEM_OPTIONS.find(opt => opt.key === selectedSystem)?.label || selectedSystem,
          data: analytics[selectedSystem as keyof typeof analytics] as SystemUsage[]
        }
      ];

  return (
    <Card className="mb-8 bg-gradient-to-r from-background via-background/95 to-background border-2 shadow-lg">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              System Usage Analytics
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              Distribution of software systems across active member institutions
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('pie')}
              className="gap-2"
            >
              <PieChartIcon className="h-4 w-4" />
              Pie Charts
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Line Charts
            </Button>
          </div>
          
          <Select value={selectedSystem} onValueChange={setSelectedSystem}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select system type" />
            </SelectTrigger>
            <SelectContent>
              {SYSTEM_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.key} value={option.key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
            {systemsToShow.map(({ key, title, data }) => 
              renderSystemChart(title, data, key)
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}