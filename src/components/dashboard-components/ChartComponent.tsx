import { DashboardComponent } from '@/hooks/useDashboards';

interface ChartComponentProps {
  component: DashboardComponent;
}

export function ChartComponent({ component }: ChartComponentProps) {
  return (
    <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-2">📊</div>
        <div className="text-sm font-medium">{component.config.chartType || 'Bar'} Chart</div>
        <div className="text-xs text-muted-foreground">
          Data: {component.config.dataSource || 'organizations'}
        </div>
      </div>
    </div>
  );
}