import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useSystemAnalytics, SystemUsage } from '@/hooks/useSystemAnalytics';
import { InstitutionsModal } from '@/components/InstitutionsModal';
import { AnalyticsFeedbackDialog } from '@/components/AnalyticsFeedbackDialog';
import { PieChart as PieChartIcon, TrendingUp, BarChart3, Monitor, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

const SYSTEM_OPTIONS = [
  { key: 'all', label: 'All Systems', icon: BarChart3 },
  { key: 'student_information_system', label: 'Student Information Systems', icon: PieChartIcon },
  { key: 'financial_system', label: 'Financial Systems', icon: PieChartIcon },
  { key: 'learning_management', label: 'Learning Management Systems', icon: PieChartIcon },
  { key: 'financial_aid', label: 'Financial Aid Systems', icon: PieChartIcon },
  { key: 'hcm_hr', label: 'Human Capital Management', icon: PieChartIcon },
  { key: 'payroll_system', label: 'Payroll Systems', icon: PieChartIcon },
  { key: 'purchasing_system', label: 'Purchasing Systems', icon: PieChartIcon },
  { key: 'housing_management', label: 'Housing Management', icon: PieChartIcon },
  { key: 'admissions_crm', label: 'Admissions CRM', icon: PieChartIcon },
  { key: 'alumni_advancement_crm', label: 'Alumni & Advancement CRM', icon: PieChartIcon },
  { key: 'payment_platform', label: 'Payment Platforms', icon: PieChartIcon },
  { key: 'meal_plan_management', label: 'Meal Plan Management', icon: PieChartIcon },
  { key: 'identity_management', label: 'Identity Management', icon: PieChartIcon },
  { key: 'door_access', label: 'Door Access Systems', icon: PieChartIcon },
  { key: 'document_management', label: 'Document Management', icon: PieChartIcon },
  { key: 'voip', label: 'VoIP Systems', icon: PieChartIcon },
  { key: 'network_infrastructure', label: 'Network Infrastructure', icon: PieChartIcon },
  { key: 'primary_office_hardware', label: 'Primary Office Hardware', icon: Monitor },
];

const SYSTEM_DATA_MAP = [
  { key: 'student_information_system', title: 'Student Information Systems' },
  { key: 'financial_system', title: 'Financial Systems' },
  { key: 'learning_management', title: 'Learning Management Systems' },
  { key: 'financial_aid', title: 'Financial Aid Systems' },
  { key: 'hcm_hr', title: 'Human Capital Management' },
  { key: 'payroll_system', title: 'Payroll Systems' },
  { key: 'purchasing_system', title: 'Purchasing Systems' },
  { key: 'housing_management', title: 'Housing Management' },
  { key: 'admissions_crm', title: 'Admissions CRM' },
  { key: 'alumni_advancement_crm', title: 'Alumni & Advancement CRM' },
  { key: 'payment_platform', title: 'Payment Platforms' },
  { key: 'meal_plan_management', title: 'Meal Plan Management' },
  { key: 'identity_management', title: 'Identity Management' },
  { key: 'door_access', title: 'Door Access Systems' },
  { key: 'document_management', title: 'Document Management' },
  { key: 'voip', title: 'VoIP Systems' },
  { key: 'network_infrastructure', title: 'Network Infrastructure' },
  { key: 'primary_office_hardware', title: 'Primary Office Hardware' },
];

export function SystemAnalyticsDashboard() {
  const { data: analytics, isLoading, error } = useSystemAnalytics();
  const queryClient = useQueryClient();
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSystemField, setSelectedSystemField] = useState<string | null>(null);
  const [selectedSystemName, setSelectedSystemName] = useState<string | null>(null);
  const [selectedSystemDisplayName, setSelectedSystemDisplayName] = useState<string | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSystemClick = (systemField: string, systemName: string, systemDisplayName: string) => {
    setSelectedSystemField(systemField);
    setSelectedSystemName(systemName);
    setSelectedSystemDisplayName(systemDisplayName);
    setModalOpen(true);
  };

  const getSystemData = (systemKey: string): SystemUsage[] => {
    if (!analytics) return [];
    
    const systemMap: Record<string, SystemUsage[]> = {
      'student_information_system': analytics.studentInformationSystems,
      'financial_system': analytics.financialSystems,
      'learning_management': analytics.learningManagementSystems,
      'financial_aid': analytics.financialAidSystems,
      'hcm_hr': analytics.hcmSystems,
      'payroll_system': analytics.payrollSystems,
      'purchasing_system': analytics.purchasingSystems,
      'housing_management': analytics.housingManagementSystems,
      'admissions_crm': analytics.admissionsCrms,
      'alumni_advancement_crm': analytics.alumniAdvancementCrms,
      'payment_platform': analytics.paymentPlatforms,
      'meal_plan_management': analytics.mealPlanManagement,
      'identity_management': analytics.identityManagement,
      'door_access': analytics.doorAccess,
      'document_management': analytics.documentManagement,
      'voip': analytics.voipSystems,
      'network_infrastructure': analytics.networkInfrastructure,
      'primary_office_hardware': analytics.primaryOfficeHardware,
    };
    
    return systemMap[systemKey] || [];
  };

  const renderChart = (data: SystemUsage[], title: string, systemKey: string) => (
    <Card key={systemKey} className="w-full bg-gradient-to-br from-card to-card/50 border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-2xl font-bold text-foreground">
          {data.reduce((sum, item) => sum + item.count, 0)} institutions{systemKey === 'primary_office_hardware' ? ' reporting' : ''}
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
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
          {data.map((item, index) => (
            <div key={`${systemKey}-${item.name}-${index}`} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <button
                  onClick={() => handleSystemClick(systemKey, item.name, title)}
                  className="text-muted-foreground hover:text-primary transition-colors truncate max-w-[120px] text-left cursor-pointer"
                  title={`Click to view institutions using ${item.name}`}
                >
                  {item.name}
                </button>
              </div>
              <span className="font-medium text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card className="mb-8 bg-gradient-to-r from-background via-background/95 to-background border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            System Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-8 bg-gradient-to-r from-background via-background/95 to-background border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl text-destructive">
            <div className="p-2 rounded-lg bg-destructive/10">
              <BarChart3 className="h-6 w-6 text-destructive" />
            </div>
            System Usage Analytics - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load system analytics data</p>
        </CardContent>
      </Card>
    );
  }

  const systemsToShow = selectedSystem === 'all' 
    ? SYSTEM_DATA_MAP
    : SYSTEM_DATA_MAP.filter(system => system.key === selectedSystem);

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsRefreshing(true);
                toast.info('Refreshing analytics data...');
                
                try {
                  const { data, error } = await supabase.functions.invoke('refresh-analytics-datacube');
                  
                  if (error) {
                    throw error;
                  }
                  
                  // Invalidate the query cache to refetch the data
                  await queryClient.invalidateQueries({ queryKey: ['system-analytics-datacube'] });
                  
                  toast.success('Analytics data refreshed successfully!');
                } catch (error) {
                  console.error('Failed to refresh analytics:', error);
                  toast.error('Failed to refresh analytics data. Please try again.');
                } finally {
                  setIsRefreshing(false);
                }
              }}
              className="gap-2"
              disabled={isRefreshing}
            >
              <TrendingUp className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeedbackDialogOpen(true)}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              What would you like to see?
            </Button>
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
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Bar Charts
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
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {systemsToShow.map(({ key, title }) => {
              const data = getSystemData(key);
              return data.length > 0 ? renderChart(data, title, key) : null;
            })}
          </div>
        </div>
      </CardContent>
      
      <InstitutionsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        systemField={selectedSystemField}
        systemName={selectedSystemName}
        systemDisplayName={selectedSystemDisplayName}
      />
      
      <AnalyticsFeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
      />
    </Card>
  );
}