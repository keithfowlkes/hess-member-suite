import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Table, Type, TrendingUp, Grip, Trash2, Settings } from 'lucide-react';
import { DashboardComponent } from '@/hooks/useDashboards';
import { ChartComponent } from './dashboard-components/ChartComponent';
import { TableComponent } from './dashboard-components/TableComponent';
import { MetricComponent } from './dashboard-components/MetricComponent';
import { TextComponent } from './dashboard-components/TextComponent';

interface DashboardComponentRendererProps {
  component: DashboardComponent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<DashboardComponent>) => void;
  onDelete: (id: string) => void;
}

export function DashboardComponentRenderer({
  component,
  isSelected,
  onSelect,
  onUpdate,
  onDelete
}: DashboardComponentRendererProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIcon = () => {
    switch (component.type) {
      case 'chart': return BarChart3;
      case 'table': return Table;
      case 'metric': return TrendingUp;
      case 'text': return Type;
      default: return BarChart3;
    }
  };

  const Icon = getIcon();

  const renderComponentContent = () => {
    switch (component.type) {
      case 'chart':
        return <ChartComponent component={component} />;
      case 'table':
        return <TableComponent component={component} />;
      case 'metric':
        return <MetricComponent component={component} />;
      case 'text':
        return <TextComponent component={component} />;
      default:
        return <div className="p-4 text-center text-muted-foreground">Unknown component type</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card 
        className={`transition-all duration-200 ${
          isSelected 
            ? 'ring-2 ring-primary ring-offset-2 shadow-lg' 
            : 'hover:shadow-md'
        }`}
        onClick={onSelect}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4" />
              {component.title}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(component.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
              >
                <Grip className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="group">
          {renderComponentContent()}
        </CardContent>
      </Card>
    </div>
  );
}