import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DashboardComponent } from '@/hooks/useDashboards';
import { DashboardComponentRenderer } from './DashboardComponentRenderer';

interface DashboardCanvasProps {
  components: DashboardComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
  onUpdateComponent: (id: string, updates: Partial<DashboardComponent>) => void;
  onDeleteComponent: (id: string) => void;
}

export function DashboardCanvas({ 
  components, 
  selectedComponentId, 
  onSelectComponent,
  onUpdateComponent,
  onDeleteComponent
}: DashboardCanvasProps) {
  const { setNodeRef } = useDroppable({
    id: 'dashboard-canvas',
  });

  return (
    <div
      ref={setNodeRef}
      className="min-h-full p-8 bg-gradient-to-br from-background to-muted/20"
    >
      {components.length === 0 ? (
        <div className="flex items-center justify-center h-96 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Start Building Your Dashboard
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag components from the sidebar to create your custom dashboard
            </p>
          </div>
        </div>
      ) : (
        <SortableContext 
          items={components.map(c => c.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {components.map((component) => (
              <DashboardComponentRenderer
                key={component.id}
                component={component}
                isSelected={selectedComponentId === component.id}
                onSelect={() => onSelectComponent(component.id)}
                onUpdate={onUpdateComponent}
                onDelete={onDeleteComponent}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}