import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { 
  LogIn, 
  UserPlus, 
  Edit, 
  Settings2, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  Loader2
} from 'lucide-react';

interface AuthFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'number';
  placeholder?: string;
  required: boolean;
  visible: boolean;
  order: number;
  options?: string[]; // For select fields
  description?: string;
}

interface AuthPageConfig {
  signin: AuthFieldConfig[];
  signup: AuthFieldConfig[];
  memberUpdate: AuthFieldConfig[];
}

const defaultAuthConfig: AuthPageConfig = {
  signin: [
    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter your email', required: true, visible: true, order: 1 },
    { id: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password', required: true, visible: true, order: 2 },
    { id: 'remember', label: 'Remember me', type: 'checkbox', required: false, visible: true, order: 3 }
  ],
  signup: [
    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter your email', required: true, visible: true, order: 1 },
    { id: 'password', label: 'Password', type: 'password', placeholder: 'Create a password', required: true, visible: true, order: 2 },
    { id: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password', required: true, visible: true, order: 3 },
    { id: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter your first name', required: true, visible: true, order: 4 },
    { id: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter your last name', required: true, visible: true, order: 5 },
    { id: 'organization', label: 'Organization Name', type: 'text', placeholder: 'Enter organization name', required: true, visible: true, order: 6 },
    { id: 'stateAssociation', label: 'State Association', type: 'select', required: false, visible: true, order: 7 },
    { id: 'studentFte', label: 'Student FTE', type: 'number', placeholder: 'Enter student FTE', required: false, visible: true, order: 8 },
    { id: 'address', label: 'Address', type: 'text', placeholder: 'Enter address', required: false, visible: true, order: 9 },
    { id: 'city', label: 'City', type: 'text', placeholder: 'Enter city', required: false, visible: true, order: 10 },
    { id: 'state', label: 'State', type: 'select', required: false, visible: true, order: 11 },
    { id: 'zip', label: 'ZIP Code', type: 'text', placeholder: 'Enter ZIP code', required: false, visible: true, order: 12 },
    { id: 'primaryContactTitle', label: 'Primary Contact Title', type: 'text', placeholder: 'Enter job title', required: false, visible: true, order: 13 },
    { id: 'isPrivateNonProfit', label: 'Private Non-Profit Institution', type: 'checkbox', required: false, visible: true, order: 14 }
  ],
  memberUpdate: [
    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter your email', required: true, visible: true, order: 1 },
    { id: 'organization', label: 'Organization Name', type: 'select', required: true, visible: true, order: 2 },
    { id: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter your first name', required: true, visible: true, order: 3 },
    { id: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter your last name', required: true, visible: true, order: 4 },
    { id: 'stateAssociation', label: 'State Association', type: 'select', required: false, visible: true, order: 5 },
    { id: 'studentFte', label: 'Student FTE', type: 'number', placeholder: 'Enter student FTE', required: false, visible: true, order: 6 }
  ]
};

export function AuthPageFieldsManager() {
  const [authConfig, setAuthConfig] = useState<AuthPageConfig>(defaultAuthConfig);
  const [activeTab, setActiveTab] = useState<keyof AuthPageConfig>('signin');
  const [editingField, setEditingField] = useState<AuthFieldConfig | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: authConfigSetting } = useSystemSetting('auth_page_config');
  const updateSystemSetting = useUpdateSystemSetting();
  const { toast } = useToast();

  useEffect(() => {
    if (authConfigSetting?.setting_value) {
      try {
        const parsedConfig = JSON.parse(authConfigSetting.setting_value);
        setAuthConfig(parsedConfig);
      } catch (error) {
        console.error('Failed to parse auth config:', error);
        // Use default config if parsing fails
        setAuthConfig(defaultAuthConfig);
      }
    }
  }, [authConfigSetting]);

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await updateSystemSetting.mutateAsync({
        settingKey: 'auth_page_config',
        settingValue: JSON.stringify(authConfig),
        description: 'Configuration for authentication page form fields'
      });
      toast({
        title: 'Success',
        description: 'Authentication page configuration saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (tabKey: keyof AuthPageConfig, fieldId: string, updates: Partial<AuthFieldConfig>) => {
    setAuthConfig(prev => ({
      ...prev,
      [tabKey]: prev[tabKey].map(field => 
        field.id === fieldId 
          ? { ...field, ...updates }
          : field
      )
    }));
  };

  const handleDeleteField = (tabKey: keyof AuthPageConfig, fieldId: string) => {
    setAuthConfig(prev => ({
      ...prev,
      [tabKey]: prev[tabKey].filter(field => field.id !== fieldId)
    }));
  };

  const handleAddField = (tabKey: keyof AuthPageConfig, newField: Omit<AuthFieldConfig, 'id' | 'order'>) => {
    const maxOrder = Math.max(...authConfig[tabKey].map(f => f.order), 0);
    const fieldWithId: AuthFieldConfig = {
      ...newField,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order: maxOrder + 1
    };
    
    setAuthConfig(prev => ({
      ...prev,
      [tabKey]: [...prev[tabKey], fieldWithId]
    }));
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧';
      case 'password': return '🔒';
      case 'textarea': return '📝';
      case 'select': return '📋';
      case 'checkbox': return '☑️';
      case 'number': return '🔢';
      default: return '📄';
    }
  };

  const FieldEditor = ({ field, onUpdate, onDelete }: { 
    field: AuthFieldConfig; 
    onUpdate: (updates: Partial<AuthFieldConfig>) => void;
    onDelete: () => void;
  }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getFieldTypeIcon(field.type)}</span>
            <h4 className="font-medium">{field.label}</h4>
            <Badge variant={field.required ? 'destructive' : 'secondary'}>
              {field.required ? 'Required' : 'Optional'}
            </Badge>
            <Badge variant={field.visible ? 'default' : 'outline'}>
              {field.visible ? 'Visible' : 'Hidden'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingField(field);
                setIsEditDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <strong>Type:</strong> {field.type}
          </div>
          <div>
            <strong>Order:</strong> {field.order}
          </div>
          {field.placeholder && (
            <div>
              <strong>Placeholder:</strong> {field.placeholder}
            </div>
          )}
          {field.description && (
            <div className="col-span-2">
              <strong>Description:</strong> {field.description}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={field.visible}
              onCheckedChange={(checked) => onUpdate({ visible: checked })}
            />
            <Label className="text-sm">Visible</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={field.required}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
            />
            <Label className="text-sm">Required</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Authentication Page Field Configuration</h3>
          <p className="text-muted-foreground mt-1">
            Configure form fields for the sign-in, sign-up, and member update pages
          </p>
        </div>
        <Button onClick={handleSaveConfig} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof AuthPageConfig)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signin" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </TabsTrigger>
          <TabsTrigger value="signup" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Sign Up
          </TabsTrigger>
          <TabsTrigger value="memberUpdate" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Member Update
          </TabsTrigger>
        </TabsList>

        {(['signin', 'signup', 'memberUpdate'] as const).map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey} className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium">
                {tabKey === 'signin' && 'Sign In Page Fields'}
                {tabKey === 'signup' && 'Sign Up Page Fields'}
                {tabKey === 'memberUpdate' && 'Member Update Page Fields'}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingField(null);
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            <div className="space-y-4">
              {authConfig[tabKey]
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    onUpdate={(updates) => handleUpdateField(tabKey, field.id, updates)}
                    onDelete={() => handleDeleteField(tabKey, field.id)}
                  />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Field Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingField(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Edit Field' : 'Add New Field'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Field Label</Label>
              <Input
                placeholder="Enter field label"
                defaultValue={editingField?.label || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select defaultValue={editingField?.type || 'text'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                placeholder="Enter placeholder text"
                defaultValue={editingField?.placeholder || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter field description"
                defaultValue={editingField?.description || ''}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch defaultChecked={editingField?.required ?? false} />
                <Label>Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked={editingField?.visible ?? true} />
                <Label>Visible</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingField(null);
              }}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Handle save logic here
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingField(null);
              }}>
                {editingField ? 'Update' : 'Add'} Field
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}