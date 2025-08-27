import { DashboardComponent } from '@/hooks/useDashboards';

interface MetricComponentProps {
  component: DashboardComponent;
}

export function MetricComponent({ component }: MetricComponentProps) {
  const metric = component.config.metric;
  
  return (
    <div className="text-center p-6">
      <div className="text-3xl font-bold text-primary mb-2">
        {metric?.value || '0'}
      </div>
      <div className="text-sm text-muted-foreground">
        {metric?.label || 'Metric Label'}
      </div>
      {metric?.change && (
        <div className={`text-xs mt-2 ${
          metric.changeType === 'positive' ? 'text-green-600' : 
          metric.changeType === 'negative' ? 'text-red-600' : 
          'text-muted-foreground'
        }`}>
          {metric.change > 0 ? '+' : ''}{metric.change}%
        </div>
      )}
    </div>
  );
}