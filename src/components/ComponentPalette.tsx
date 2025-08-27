import { BarChart3, Table, Type, TrendingUp, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

interface ComponentButtonProps {
  component: typeof componentTypes[0];
  onAdd: (type: string) => void;
}

function ComponentButton({ component, onAdd }: ComponentButtonProps) {
  const Icon = component.icon;

  return (
    <Button
      variant="outline"
      className="w-full justify-start h-auto p-4 hover:border-primary/50"
      onClick={() => onAdd(component.id)}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${component.color}`} />
        <div className="text-left">
          <div className="font-medium text-sm">{component.title}</div>
          <div className="text-xs text-muted-foreground">{component.description}</div>
        </div>
        <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
      </div>
    </Button>
  );
}

interface ComponentPaletteProps {
  onAddComponent: (type: string) => void;
}

export function ComponentPalette({ onAddComponent }: ComponentPaletteProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Add Components</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Click to add components to your dashboard
        </p>
      </div>
      
      <div className="space-y-3">
        {componentTypes.map((component) => (
          <ComponentButton 
            key={component.id} 
            component={component} 
            onAdd={onAddComponent}
          />
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