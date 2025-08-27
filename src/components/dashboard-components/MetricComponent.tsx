import { DashboardComponent } from '@/hooks/useDashboards';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Mock data generators for different metrics
const generateMetricData = (config: any) => {
  const { dataSource, field, aggregation } = config;
  
  if (dataSource === 'organizations') {
    if (field === 'membership_status' && aggregation === 'count') {
      return { value: 189, label: 'Active Members', change: 12.5, changeType: 'positive' };
    }
    if (field === 'student_fte' && aggregation === 'sum') {
      return { value: '2.4M', label: 'Total Students', change: 5.2, changeType: 'positive' };
    }
    return { value: 189, label: 'Total Organizations', change: 8.3, changeType: 'positive' };
  }
  
  if (dataSource === 'invoices') {
    if (field === 'amount' && aggregation === 'sum') {
      return { value: '$247K', label: 'Monthly Revenue', change: 15.8, changeType: 'positive' };
    }
    if (field === 'status' && aggregation === 'count') {
      return { value: 23, label: 'Pending Invoices', change: -12.3, changeType: 'negative' };
    }
    return { value: 188, label: 'Total Invoices', change: 4.2, changeType: 'positive' };
  }
  
  if (dataSource === 'profiles') {
    return { value: 342, label: 'Registered Users', change: 7.1, changeType: 'positive' };
  }
  
  // Default metric
  return config.metric || { value: 0, label: 'Metric', change: 0, changeType: 'neutral' };
};

interface MetricComponentProps {
  component: DashboardComponent;
}

export function MetricComponent({ component }: MetricComponentProps) {
  const metric = generateMetricData(component.config);
  
  const getChangeIcon = () => {
    switch (metric.changeType) {
      case 'positive':
        return <TrendingUp className="h-3 w-3" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };
  
  const getChangeColor = () => {
    switch (metric.changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };
  
  return (
    <div className="text-center p-6">
      <div className="text-3xl font-bold text-primary mb-2">
        {metric.value}
      </div>
      <div className="text-sm text-muted-foreground mb-3">
        {metric.label}
      </div>
      {metric.change !== undefined && metric.change !== 0 && (
        <div className={`flex items-center justify-center gap-1 text-xs ${getChangeColor()}`}>
          {getChangeIcon()}
          <span>
            {metric.change > 0 ? '+' : ''}{metric.change}% vs last period
          </span>
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-2 opacity-75">
        Source: {component.config.dataSource || 'organizations'}
      </div>
    </div>
  );
}