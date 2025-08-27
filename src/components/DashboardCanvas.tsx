import { DashboardComponent } from '@/hooks/useDashboards';
import { DashboardComponentRenderer } from './DashboardComponentRenderer';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface DashboardCanvasProps {
  components: DashboardComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
  onUpdateComponent: (id: string, updates: Partial<DashboardComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onMoveComponent: (id: string, direction: 'up' | 'down') => void;
}

export function DashboardCanvas({ 
  components, 
  selectedComponentId, 
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent,
  onMoveComponent
}: DashboardCanvasProps) {
  return (
    <div className="min-h-full p-8 bg-gradient-to-br from-background to-muted/20">
      {components.length === 0 ? (
        <div className="flex items-center justify-center h-96 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Start Building Your Dashboard
            </h3>
            <p className="text-sm text-muted-foreground">
              Add components from the sidebar to create your custom dashboard
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {components.map((component, index) => (
            <div key={component.id} className="relative group">
              <DashboardComponentRenderer
                component={component}
                isSelected={selectedComponentId === component.id}
                onSelect={() => onSelectComponent(component.id)}
                onUpdate={onUpdateComponent}
                onDelete={onDeleteComponent}
              />
              
              {/* Reorder buttons */}
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {index > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMoveComponent(component.id, 'up')}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                )}
                {index < components.length - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMoveComponent(component.id, 'down')}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}