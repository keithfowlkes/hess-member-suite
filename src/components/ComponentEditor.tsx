import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Settings } from 'lucide-react';
import { DashboardComponent } from '@/hooks/useDashboards';

interface ComponentEditorProps {
  component: DashboardComponent;
  onUpdate: (updates: Partial<DashboardComponent>) => void;
  onClose: () => void;
}

export function ComponentEditor({ component, onUpdate, onClose }: ComponentEditorProps) {
  const updateConfig = (configUpdates: any) => {
    onUpdate({
      config: { ...component.config, ...configUpdates }
    });
  };

  const renderConfigEditor = () => {
    switch (component.type) {
      case 'chart':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Chart Type</Label>
              <Select
                value={component.config.chartType || 'bar'}
                onValueChange={(value) => updateConfig({ chartType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="doughnut">Doughnut Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select
                value={component.config.dataSource || 'organizations'}
                onValueChange={(value) => updateConfig({ dataSource: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizations">Organizations</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="profiles">User Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aggregation</Label>
              <Select
                value={component.config.aggregation || 'count'}
                onValueChange={(value) => updateConfig({ aggregation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="avg">Average</SelectItem>
                  <SelectItem value="min">Minimum</SelectItem>
                  <SelectItem value="max">Maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select
                value={component.config.dataSource || 'organizations'}
                onValueChange={(value) => updateConfig({ dataSource: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizations">Organizations</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="profiles">User Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Columns (comma-separated)</Label>
              <Input
                value={component.config.columns?.join(', ') || ''}
                onChange={(e) => updateConfig({ 
                  columns: e.target.value.split(',').map(col => col.trim()).filter(Boolean)
                })}
                placeholder="name, email, status"
              />
            </div>
          </div>
        );

      case 'metric':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Metric Label</Label>
              <Input
                value={component.config.metric?.label || ''}
                onChange={(e) => updateConfig({
                  metric: { ...component.config.metric, label: e.target.value }
                })}
                placeholder="Total Organizations"
              />
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                value={component.config.metric?.value || ''}
                onChange={(e) => updateConfig({
                  metric: { ...component.config.metric, value: e.target.value }
                })}
                placeholder="1250"
              />
            </div>

            <div className="space-y-2">
              <Label>Change Percentage</Label>
              <Input
                type="number"
                value={component.config.metric?.change || ''}
                onChange={(e) => updateConfig({
                  metric: { ...component.config.metric, change: parseFloat(e.target.value) }
                })}
                placeholder="12.5"
              />
            </div>

            <div className="space-y-2">
              <Label>Change Type</Label>
              <Select
                value={component.config.metric?.changeType || 'neutral'}
                onValueChange={(value) => updateConfig({
                  metric: { ...component.config.metric, changeType: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={component.config.content || ''}
                onChange={(e) => updateConfig({ content: e.target.value })}
                placeholder="Enter your text content..."
                rows={6}
              />
            </div>
          </div>
        );

      default:
        return <div className="text-sm text-muted-foreground">No configuration available</div>;
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h3 className="font-medium">Component Settings</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Basic Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Component Title</Label>
              <Input
                value={component.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Enter component title..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Component-specific Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuration</CardTitle>
            <CardDescription>
              Configure how this {component.type} component displays data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderConfigEditor()}
          </CardContent>
        </Card>

        {/* Position & Size */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Width: {component.position.width}px</div>
              <div>Height: {component.position.height}px</div>
              <div>X: {component.position.x}px</div>
              <div>Y: {component.position.y}px</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}