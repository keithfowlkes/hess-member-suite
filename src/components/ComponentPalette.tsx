import { useDraggable } from '@dnd-kit/core';
import { BarChart3, Table, Type, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const componentTypes = [
  {
    id: 'chart',
    title: 'Chart',
    description: 'Bar, line, pie charts',
    icon: BarChart3,
    color: 'text-blue-500'
  },
  {
    id: 'table',
    title: 'Data Table',
    description: 'Tabular data display',
    icon: Table,
    color: 'text-green-500'
  },
  {
    id: 'metric',
    title: 'Metric Card',
    description: 'Key performance indicator',
    icon: TrendingUp,
    color: 'text-purple-500'
  },
  {
    id: 'text',
    title: 'Text Block',
    description: 'Rich text content',
    icon: Type,
    color: 'text-orange-500'
  }
];

function DraggableComponent({ component }: { component: typeof componentTypes[0] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${component.id}`,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const Icon = component.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card className="hover:shadow-md transition-shadow border-2 border-dashed border-transparent hover:border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${component.color}`} />
            <div>
              <div className="font-medium text-sm">{component.title}</div>
              <div className="text-xs text-muted-foreground">{component.description}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ComponentPalette() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Drag Components to Canvas</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Drag and drop components from here to build your dashboard
        </p>
      </div>
      
      <div className="space-y-3">
        {componentTypes.map((component) => (
          <DraggableComponent key={component.id} component={component} />
        ))}
      </div>

      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Available Data Sources</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>• Organizations</div>
          <div>• Invoices</div>
          <div>• System Settings</div>
          <div>• User Profiles</div>
        </div>
      </div>
    </div>
  );
}