import { DashboardComponent } from '@/hooks/useDashboards';

interface TableComponentProps {
  component: DashboardComponent;
}

export function TableComponent({ component }: TableComponentProps) {
  return (
    <div className="border rounded-lg">
      <div className="text-center p-8">
        <div className="text-2xl mb-2">📋</div>
        <div className="text-sm font-medium">Data Table</div>
        <div className="text-xs text-muted-foreground">
          Columns: {component.config.columns?.join(', ') || 'name, email, status'}
        </div>
      </div>
    </div>
  );
}