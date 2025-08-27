import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  Save, 
  X, 
  BarChart3, 
  Table, 
  Type, 
  TrendingUp,
  Plus,
  Settings,
  Grip
} from 'lucide-react';
import { useDashboard, useCreateDashboard, useUpdateDashboard, DashboardComponent } from '@/hooks/useDashboards';
import { DashboardCanvas } from './DashboardCanvas';
import { ComponentPalette } from './ComponentPalette';
import { ComponentEditor } from './ComponentEditor';

interface DashboardBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId?: string | null;
}

export function DashboardBuilder({ open, onOpenChange, dashboardId }: DashboardBuilderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [components, setComponents] = useState<DashboardComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: dashboard } = useDashboard(dashboardId || '');
  const createDashboardMutation = useCreateDashboard();
  const updateDashboardMutation = useUpdateDashboard();

  const isEditing = !!dashboardId;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (dashboard) {
      setTitle(dashboard.title);
      setDescription(dashboard.description || '');
      setIsPublic(dashboard.is_public);
      setComponents(dashboard.layout.components || []);
    } else if (open && !isEditing) {
      // Reset form for new dashboard
      setTitle('');
      setDescription('');
      setIsPublic(false);
      setComponents([]);
      setSelectedComponentId(null);
    }
  }, [dashboard, open, isEditing]);

  const handleSave = async () => {
    if (!title.trim()) return;

    const dashboardData = {
      title: title.trim(),
      description: description.trim(),
      layout: { components },
      is_public: isPublic,
    };

    try {
      if (isEditing && dashboardId) {
        await updateDashboardMutation.mutateAsync({ id: dashboardId, ...dashboardData });
      } else {
        await createDashboardMutation.mutateAsync(dashboardData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in hooks
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag end:', { activeId: active.id, overId: over?.id });
    
    if (!over) {
      console.log('No drop target found');
      setActiveId(null);
      return;
    }

    // Handle dropping from palette to canvas
    if (active.id.toString().startsWith('palette-') && over.id === 'dashboard-canvas') {
      const componentType = active.id.toString().replace('palette-', '') as DashboardComponent['type'];
      console.log('Creating new component:', componentType);
      
      const newComponent: DashboardComponent = {
        id: `component-${Date.now()}`,
        type: componentType,
        title: `New ${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`,
        config: getDefaultConfig(componentType),
        position: {
          x: 0,
          y: components.length * 200,
          width: 400,
          height: 200
        }
      };
      setComponents(prev => [...prev, newComponent]);
    } 
    // Handle reordering components within canvas
    else if (!active.id.toString().startsWith('palette-') && active.id !== over.id) {
      setComponents((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const getDefaultConfig = (type: DashboardComponent['type']) => {
    switch (type) {
      case 'chart':
        return {
          chartType: 'bar' as const,
          dataSource: 'organizations',
          aggregation: 'count' as const
        };
      case 'table':
        return {
          dataSource: 'organizations',
          columns: ['name', 'membership_status', 'city', 'state']
        };
      case 'metric':
        return {
          metric: {
            value: 0,
            label: 'Total Count',
            change: 0,
            changeType: 'neutral' as const
          }
        };
      case 'text':
        return {
          content: 'Add your text content here...'
        };
      default:
        return {};
    }
  };

  const updateComponent = (componentId: string, updates: Partial<DashboardComponent>) => {
    setComponents(prev => 
      prev.map(comp => 
        comp.id === componentId ? { ...comp, ...updates } : comp
      )
    );
  };

  const deleteComponent = (componentId: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== componentId));
    if (selectedComponentId === componentId) {
      setSelectedComponentId(null);
    }
  };

  const selectedComponent = components.find(comp => comp.id === selectedComponentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Dashboard' : 'Create New Dashboard'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(95vh-120px)]">
          {/* Left Sidebar - Settings & Palette */}
          <div className="w-80 border-r bg-muted/30 overflow-y-auto">
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="components">Components</TabsTrigger>
              </TabsList>
              
              <TabsContent value="settings" className="p-4 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Dashboard Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter dashboard title..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter dashboard description..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="public"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                    <Label htmlFor="public">Make dashboard public</Label>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Dashboard Stats</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Components: {components.length}</div>
                    <div>Status: {isPublic ? 'Public' : 'Private'}</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="components" className="p-4">
                <ComponentPalette />
              </TabsContent>
            </Tabs>
          </div>

          {/* Main Canvas */}
          <div className="flex-1 flex">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex-1 overflow-auto bg-background">
                <DashboardCanvas
                  components={components}
                  selectedComponentId={selectedComponentId}
                  onSelectComponent={setSelectedComponentId}
                  onUpdateComponent={updateComponent}
                  onDeleteComponent={deleteComponent}
                />
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="bg-primary/10 border-2 border-primary border-dashed rounded-lg p-4">
                    <div className="text-sm font-medium">
                      {activeId.toString().startsWith('palette-') 
                        ? `New ${activeId.toString().replace('palette-', '')} Component`
                        : 'Moving Component'
                      }
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Right Sidebar - Component Editor */}
          {selectedComponent && (
            <div className="w-80 border-l bg-muted/30 overflow-y-auto">
              <ComponentEditor
                component={selectedComponent}
                onUpdate={(updates) => updateComponent(selectedComponent.id, updates)}
                onClose={() => setSelectedComponentId(null)}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!title.trim() || createDashboardMutation.isPending || updateDashboardMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {createDashboardMutation.isPending || updateDashboardMutation.isPending 
              ? 'Saving...' 
              : isEditing ? 'Update Dashboard' : 'Create Dashboard'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}