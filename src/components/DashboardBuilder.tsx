import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useDashboard, useCreateDashboard, useUpdateDashboard, DashboardComponent } from '@/hooks/useDashboards';
import { DashboardCanvas } from './DashboardCanvas';
import { ComponentEditor } from './ComponentEditor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

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
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: dashboard } = useDashboard(dashboardId || '');
  const createDashboardMutation = useCreateDashboard();
  const updateDashboardMutation = useUpdateDashboard();
  const { user } = useAuth();
  const { toast } = useToast();

  const isEditing = !!dashboardId;

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

  const handleGenerateDashboard = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe what kind of dashboard you want to create",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id);
      
      const isAdmin = userRoles?.some(role => role.role === 'admin');
      
      const { data, error } = await supabase.functions.invoke('ai-dashboard-generator', {
        body: { 
          prompt: aiPrompt,
          userRole: isAdmin ? 'admin' : 'member'
        }
      });

      if (error) throw error;

      if (data.success && data.dashboard) {
        setTitle(data.dashboard.title);
        setDescription(data.dashboard.description || '');
        setComponents(data.dashboard.components);
        setSelectedComponentId(null);
        
        toast({
          title: "Dashboard Generated!",
          description: "Your AI-powered dashboard has been created. You can now customize it further.",
        });
      } else {
        throw new Error(data.error || 'Failed to generate dashboard');
      }
      
    } catch (error) {
      console.error('Error generating dashboard:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate dashboard. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDashboard = async () => {
    setComponents([]);
    await handleGenerateDashboard();
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

  const moveComponent = (componentId: string, direction: 'up' | 'down') => {
    setComponents(prev => {
      const index = prev.findIndex(comp => comp.id === componentId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newComponents = [...prev];
      [newComponents[index], newComponents[newIndex]] = [newComponents[newIndex], newComponents[index]];
      return newComponents;
    });
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
                <TabsTrigger value="ai-builder">AI Builder</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ai-builder" className="p-4 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">AI Dashboard Generator</h3>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Describe Your Dashboard</CardTitle>
                      <CardDescription>
                        Tell the AI what kind of dashboard you want to create. Be specific about the data and insights you need.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="ai-prompt">Dashboard Description</Label>
                        <Textarea
                          id="ai-prompt"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="E.g., 'Create a comprehensive membership overview dashboard showing organization distribution by state, membership status breakdown, revenue analytics, and recent invoice trends. Include key metrics like total active members and monthly revenue.'"
                          rows={4}
                          className="mt-2"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleGenerateDashboard}
                          disabled={isGenerating || !aiPrompt.trim()}
                          className="flex-1"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Dashboard
                            </>
                          )}
                        </Button>
                        
                        {components.length > 0 && (
                          <Button 
                            variant="outline"
                            onClick={handleRegenerateDashboard}
                            disabled={isGenerating}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Available Data Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>• Organizations ({'>'}1000 records)</div>
                        <div>• Invoices & Revenue</div>
                        <div>• User Profiles</div>
                        <div>• Membership Data</div>
                        <div>• Geographic Distribution</div>
                        <div>• System Usage Analytics</div>
                        <div>• Financial Metrics</div>
                        <div>• Activity Logs</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Example Prompts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm space-y-2">
                        <div className="p-2 bg-muted rounded cursor-pointer" onClick={() => setAiPrompt("Create a financial overview dashboard showing monthly revenue trends, invoice status distribution, overdue payments, and top paying organizations.")}>
                          <strong>Financial Overview:</strong> Monthly revenue, invoice status, payments
                        </div>
                        <div className="p-2 bg-muted rounded cursor-pointer" onClick={() => setAiPrompt("Build a membership analytics dashboard with geographic distribution, membership status breakdown, student FTE analysis, and growth trends over time.")}>
                          <strong>Membership Analytics:</strong> Geographic distribution, status breakdown, growth
                        </div>
                        <div className="p-2 bg-muted rounded cursor-pointer" onClick={() => setAiPrompt("Design a system usage dashboard showing software adoption across organizations, popular technology choices, and hardware preferences by institution type.")}>
                          <strong>System Usage:</strong> Software adoption, technology choices, preferences
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

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
                    {components.length > 0 && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded text-green-700 dark:text-green-300 text-xs">
                        ✨ AI Generated Dashboard
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Main Canvas */}
          <div className="flex-1 flex">
            <div className="flex-1 overflow-auto bg-background">
              <DashboardCanvas
                components={components}
                selectedComponentId={selectedComponentId}
                onSelectComponent={setSelectedComponentId}
                onUpdateComponent={updateComponent}
                onDeleteComponent={deleteComponent}
                onMoveComponent={moveComponent}
              />
            </div>
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