import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ProgressiveSystemChart } from '@/components/ProgressiveSystemChart';
import { InstitutionsModal } from '@/components/InstitutionsModal';
import { PieChart as PieChartIcon, TrendingUp, BarChart3 } from 'lucide-react';

const SYSTEM_OPTIONS = [
  { key: 'all', label: 'All Systems', icon: BarChart3 },
  { key: 'student_information_system', label: 'Student Information Systems', icon: PieChartIcon },
  { key: 'financial_system', label: 'Financial Systems', icon: PieChartIcon },
  { key: 'learning_management', label: 'Learning Management Systems', icon: PieChartIcon },
  { key: 'financial_aid', label: 'Financial Aid Systems', icon: PieChartIcon },
  { key: 'hcm_hr', label: 'Human Capital Management', icon: PieChartIcon },
  { key: 'payroll_system', label: 'Payroll Systems', icon: PieChartIcon },
  { key: 'housing_management', label: 'Housing Management', icon: PieChartIcon },
  { key: 'admissions_crm', label: 'Admissions CRM', icon: PieChartIcon },
  { key: 'alumni_advancement_crm', label: 'Alumni & Advancement CRM', icon: PieChartIcon },
];

const SYSTEM_DATA_MAP = [
  { key: 'student_information_system', title: 'Student Information Systems' },
  { key: 'financial_system', title: 'Financial Systems' },
  { key: 'learning_management', title: 'Learning Management Systems' },
  { key: 'financial_aid', title: 'Financial Aid Systems' },
  { key: 'hcm_hr', title: 'Human Capital Management' },
  { key: 'payroll_system', title: 'Payroll Systems' },
  { key: 'housing_management', title: 'Housing Management' },
  { key: 'admissions_crm', title: 'Admissions CRM' },
  { key: 'alumni_advancement_crm', title: 'Alumni & Advancement CRM' },
];

export function SystemAnalyticsDashboard() {
  const [chartType, setChartType] = useState<'pie' | 'line'>('pie');
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSystemField, setSelectedSystemField] = useState<string | null>(null);
  const [selectedSystemName, setSelectedSystemName] = useState<string | null>(null);
  const [selectedSystemDisplayName, setSelectedSystemDisplayName] = useState<string | null>(null);

  const handleSystemClick = (systemField: string, systemName: string, systemDisplayName: string) => {
    setSelectedSystemField(systemField);
    setSelectedSystemName(systemName);
    setSelectedSystemDisplayName(systemDisplayName);
    setModalOpen(true);
  };

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
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {systemsToShow.map(({ key, title }) => (
              <ProgressiveSystemChart
                key={key}
                title={title}
                systemField={key}
                chartType={chartType}
                onSystemClick={handleSystemClick}
              />
            ))}
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
    </Card>
  );
}