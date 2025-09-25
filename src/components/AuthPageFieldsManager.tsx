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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { 
  LogIn, 
  UserPlus, 
  Edit, 
  Save, 
  Plus, 
  Trash2, 
  Loader2,
  GripVertical,
  Mail,
  Lock,
  Hash,
  Type,
  CheckSquare,
  FileText,
  Eye
} from 'lucide-react';

interface AuthFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'number';
  placeholder?: string;
  required: boolean;
  visible: boolean;
  order: number;
  section?: string;
  isCore?: boolean; // Core fields cannot be deleted
  options?: string[];
  description?: string;
}

interface AuthPageConfig {
  signin: AuthFieldConfig[];
  signup: AuthFieldConfig[];
  memberUpdate: AuthFieldConfig[];
}

// Based on actual fields from Auth.tsx
const defaultAuthConfig: AuthPageConfig = {
  signin: [
    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter your email', required: true, visible: true, order: 1, isCore: true },
    { id: 'password', label: 'Password', type: 'password', placeholder: 'Enter your password', required: true, visible: true, order: 2, isCore: true }
  ],
  signup: [
    // Eligibility Section
    { id: 'isPrivateNonProfit', label: 'My institution is a private, non-profit college or university', type: 'checkbox', required: true, visible: true, order: 1, section: 'Eligibility', isCore: true, description: 'Only private, non-profit institutions of higher education are eligible for HESS Consortium membership.' },
    { id: 'signupType', label: 'Registration Type', type: 'select', options: ['new-member'], required: true, visible: true, order: 2, section: 'Eligibility', isCore: true },
    
    // Account Information Section
    { id: 'email', label: 'Primary Email Address', type: 'email', placeholder: 'your.email@institution.edu', required: true, visible: true, order: 3, section: 'Account Information', isCore: true, description: 'This will be your login email address' },
    { id: 'password', label: 'Password', type: 'password', placeholder: 'Create a secure password', required: true, visible: true, order: 4, section: 'Account Information', isCore: true, description: 'Minimum 6 characters required' },
    { id: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm password', required: true, visible: true, order: 5, section: 'Account Information', isCore: true },
    
    // Contact Details Section
    { id: 'firstName', label: 'First Name', type: 'text', placeholder: 'First name', required: true, visible: true, order: 6, section: 'Contact Details', isCore: true },
    { id: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Last name', required: true, visible: true, order: 7, section: 'Contact Details', isCore: true },
    { id: 'title', label: 'Title/Position', type: 'text', placeholder: 'Your job title', required: true, visible: true, order: 8, section: 'Contact Details', isCore: false },
    { id: 'phone', label: 'Phone Number', type: 'text', placeholder: '(555) 123-4567', required: true, visible: true, order: 9, section: 'Contact Details', isCore: false },
    
    // Institution Information Section
    { id: 'organization', label: 'Institution Name', type: 'text', placeholder: 'Your College or University Name', required: true, visible: true, order: 10, section: 'Institution Information', isCore: true },
    { id: 'address', label: 'Street Address', type: 'text', placeholder: '123 College Ave', required: true, visible: true, order: 11, section: 'Institution Information', isCore: false },
    { id: 'city', label: 'City', type: 'text', placeholder: 'City', required: true, visible: true, order: 12, section: 'Institution Information', isCore: false },
    { id: 'state', label: 'State', type: 'text', placeholder: 'State', required: true, visible: true, order: 13, section: 'Institution Information', isCore: false },
    { id: 'zip', label: 'ZIP Code', type: 'text', placeholder: '12345', required: true, visible: true, order: 14, section: 'Institution Information', isCore: false },
    
    // Secondary Contact Section
    { id: 'secondaryFirstName', label: 'First Name', type: 'text', placeholder: 'Secondary contact first name', required: false, visible: true, order: 15, section: 'Secondary Contact', isCore: false },
    { id: 'secondaryLastName', label: 'Last Name', type: 'text', placeholder: 'Secondary contact last name', required: false, visible: true, order: 16, section: 'Secondary Contact', isCore: false },
    { id: 'secondaryEmail', label: 'Email Address', type: 'email', placeholder: 'secondary@institution.edu', required: false, visible: true, order: 17, section: 'Secondary Contact', isCore: false },
    { id: 'secondaryPhone', label: 'Phone Number', type: 'text', placeholder: '(555) 123-4567', required: false, visible: true, order: 18, section: 'Secondary Contact', isCore: false },
    
    // Academic Systems Section
    { id: 'sis', label: 'Student Information System', type: 'select', options: ['Banner', 'PeopleSoft', 'PowerSchool', 'Colleague', 'Campus Nexus', 'Other'], required: false, visible: true, order: 19, section: 'Academic Systems', isCore: false },
    { id: 'lms', label: 'Learning Management System', type: 'select', options: ['Canvas', 'Blackboard', 'Moodle', 'D2L Brightspace', 'Schoology', 'Google Classroom', 'Other'], required: false, visible: true, order: 20, section: 'Academic Systems', isCore: false },
    { id: 'library', label: 'Library System', type: 'select', options: ['Alma', 'Symphony', 'Koha', 'Evergreen', 'Sierra', 'Polaris', 'Other'], required: false, visible: true, order: 21, section: 'Academic Systems', isCore: false },
    { id: 'otherSoftware', label: 'Other Software', type: 'text', placeholder: 'Other systems or software', required: false, visible: true, order: 22, section: 'Academic Systems', isCore: false },
    
    // Additional Information Section
    { id: 'desktopOS', label: 'Desktop Operating System', type: 'text', placeholder: 'e.g., Windows 11, macOS, Linux', required: false, visible: true, order: 23, section: 'Additional Information', isCore: false },
    { id: 'serverOS', label: 'Server Operating System', type: 'text', placeholder: 'e.g., Windows Server, Linux, Unix', required: false, visible: true, order: 24, section: 'Additional Information', isCore: false },
    { id: 'comments', label: 'Additional Comments', type: 'textarea', placeholder: 'Any additional information you\'d like to share...', required: false, visible: true, order: 25, section: 'Additional Information', isCore: false }
  ],
  memberUpdate: [
    // Update Type Section
    { id: 'isReassignment', label: 'This is a member information update request', type: 'checkbox', required: true, visible: true, order: 1, section: 'Update Type', isCore: true, description: 'I am an authorized agent from my current HESS member institution and am updating information for my own existing institution.' },
    
    // Contact Details Section
    { id: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true, visible: true, order: 2, section: 'Contact Details', isCore: true },
    { id: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true, visible: true, order: 3, section: 'Contact Details', isCore: true },
    { id: 'title', label: 'Title/Position', type: 'text', placeholder: 'Your job title', required: true, visible: true, order: 4, section: 'Contact Details', isCore: false },
    { id: 'phone', label: 'Phone Number', type: 'text', placeholder: '(555) 123-4567', required: true, visible: true, order: 5, section: 'Contact Details', isCore: false },
    
    // Institution Information Section - Note: Organization selector is handled specially in Auth.tsx
    { id: 'existingOrganization', label: 'Select Existing Institution', type: 'select', required: true, visible: true, order: 6, section: 'Institution Information', isCore: true, description: 'Select your institution from the list above. This will update the existing record.' },
    
    // Academic Systems Section
    { id: 'sis', label: 'Student Information System', type: 'select', options: ['Banner', 'PeopleSoft', 'PowerSchool', 'Colleague', 'Campus Nexus', 'Other'], required: false, visible: true, order: 7, section: 'Academic Systems', isCore: false },
    { id: 'lms', label: 'Learning Management System', type: 'select', options: ['Canvas', 'Blackboard', 'Moodle', 'D2L Brightspace', 'Schoology', 'Google Classroom', 'Other'], required: false, visible: true, order: 8, section: 'Academic Systems', isCore: false },
    { id: 'library', label: 'Library System', type: 'select', options: ['Alma', 'Symphony', 'Koha', 'Evergreen', 'Sierra', 'Polaris', 'Other'], required: false, visible: true, order: 9, section: 'Academic Systems', isCore: false },
    { id: 'otherSoftware', label: 'Other Software', type: 'text', placeholder: 'Other systems or software', required: false, visible: true, order: 10, section: 'Academic Systems', isCore: false },
    
    // Additional Information Section
    { id: 'desktopOS', label: 'Desktop Operating System', type: 'text', placeholder: 'e.g., Windows 11, macOS, Linux', required: false, visible: true, order: 11, section: 'Additional Information', isCore: false },
    { id: 'serverOS', label: 'Server Operating System', type: 'text', placeholder: 'e.g., Windows Server, Linux, Unix', required: false, visible: true, order: 12, section: 'Additional Information', isCore: false },
    { id: 'comments', label: 'Additional Comments', type: 'textarea', placeholder: 'Any additional information you\'d like to share...', required: false, visible: true, order: 13, section: 'Additional Information', isCore: false }
  ]
};

export function AuthPageFieldsManager() {
  const [authConfig, setAuthConfig] = useState<AuthPageConfig>(defaultAuthConfig);
  const [activeTab, setActiveTab] = useState<keyof AuthPageConfig>('signin');
  const [editingField, setEditingField] = useState<AuthFieldConfig | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newField, setNewField] = useState<Partial<AuthFieldConfig>>({
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    visible: true,
    section: '',
    description: '',
    options: undefined
  });

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

  const handleUpdateField = (fieldId: string, updates: Partial<AuthFieldConfig>) => {
    setAuthConfig(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(field => 
        field.id === fieldId 
          ? { ...field, ...updates }
          : field
      )
    }));
  };

  const handleDeleteField = (fieldId: string) => {
    const field = authConfig[activeTab].find(f => f.id === fieldId);
    if (field?.isCore) {
      toast({
        title: 'Cannot Delete',
        description: 'Core fields cannot be deleted.',
        variant: 'destructive'
      });
      return;
    }

    setAuthConfig(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(field => field.id !== fieldId)
    }));
    
    toast({
      title: 'Success',
      description: 'Field deleted successfully.',
    });
  };

  const handleAddField = () => {
    if (!newField.label || !newField.type) {
      toast({
        title: 'Error',
        description: 'Please fill in required fields (Label and Type).',
        variant: 'destructive'
      });
      return;
    }

    const maxOrder = Math.max(...authConfig[activeTab].map(f => f.order), 0);
    const fieldWithId: AuthFieldConfig = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: newField.label!,
      type: newField.type as AuthFieldConfig['type'],
      placeholder: newField.placeholder || '',
      required: newField.required || false,
      visible: newField.visible !== false,
      order: maxOrder + 1,
      section: newField.section || 'Custom Fields',
      isCore: false,
      description: newField.description || '',
      options: newField.options || undefined
    };
    
    setAuthConfig(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], fieldWithId]
    }));

    setNewField({
      label: '',
      type: 'text',
      placeholder: '',
      required: false,
      visible: true,
      section: '',
      description: '',
      options: undefined
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: 'Success',
      description: 'Field added successfully.',
    });
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentFields = [...authConfig[activeTab]].sort((a, b) => a.order - b.order);
    const fieldIndex = currentFields.findIndex(f => f.id === fieldId);
    
    if (
      (direction === 'up' && fieldIndex === 0) ||
      (direction === 'down' && fieldIndex === currentFields.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    const updatedFields = [...currentFields];
    [updatedFields[fieldIndex], updatedFields[newIndex]] = 
    [updatedFields[newIndex], updatedFields[fieldIndex]];

    updatedFields.forEach((field, index) => {
      field.order = index + 1;
    });

    setAuthConfig(prev => ({
      ...prev,
      [activeTab]: updatedFields
    }));
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'password': return <Lock className="h-4 w-4" />;
      case 'textarea': return <FileText className="h-4 w-4" />;
      case 'select': return <Hash className="h-4 w-4" />;
      case 'checkbox': return <CheckSquare className="h-4 w-4" />;
      case 'number': return <Hash className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };
  
  const groupFieldsBySection = (fields: AuthFieldConfig[]) => {
    const grouped = fields.reduce((acc, field) => {
      const section = field.section || 'General';
      if (!acc[section]) acc[section] = [];
      acc[section].push(field);
      return acc;
    }, {} as Record<string, AuthFieldConfig[]>);
    
    Object.keys(grouped).forEach(section => {
      grouped[section].sort((a, b) => a.order - b.order);
    });
    
    return grouped;
  };

  const FieldCard = ({ field }: { field: AuthFieldConfig }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              {getFieldTypeIcon(field.type)}
            </div>
            <div>
              <h4 className="font-medium">{field.label}</h4>
              <p className="text-sm text-muted-foreground">
                {field.type} • Order: {field.order}
                {field.section && ` • ${field.section}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={field.required ? 'destructive' : 'secondary'} className="text-xs">
              {field.required ? 'Required' : 'Optional'}
            </Badge>
            <Badge variant={field.visible ? 'default' : 'outline'} className="text-xs">
              {field.visible ? 'Visible' : 'Hidden'}
            </Badge>
            {field.isCore && (
              <Badge variant="outline" className="text-xs">
                Core
              </Badge>
            )}
          </div>
        </div>
        
        {field.placeholder && (
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Placeholder:</strong> {field.placeholder}
          </p>
        )}
        
        {field.options && field.options.length > 0 && (
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Options:</strong> {field.options.join(', ')}
          </p>
        )}
        
        {field.description && (
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Description:</strong> {field.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={field.visible}
                onCheckedChange={(checked) => handleUpdateField(field.id, { visible: checked })}
              />
              <Label className="text-sm">Visible</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => handleUpdateField(field.id, { required: checked })}
              />
              <Label className="text-sm">Required</Label>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveField(field.id, 'up')}
              disabled={field.order === 1}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveField(field.id, 'down')}
              disabled={field.order === authConfig[activeTab].length}
            >
              ↓
            </Button>
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
              onClick={() => handleDeleteField(field.id)}
              disabled={field.isCore}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Forms
          </Button>
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-medium">
                  {tabKey === 'signin' && 'Sign In Page Fields'}
                  {tabKey === 'signup' && 'Sign Up Page Fields'}
                  {tabKey === 'memberUpdate' && 'Member Update Page Fields'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Configure the form fields shown on the {tabKey === 'signin' ? 'sign in' : tabKey === 'signup' ? 'sign up' : 'member update'} page
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingField(null);
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </div>

            {(tabKey === 'signup' || tabKey === 'memberUpdate') ? (
              <div className="space-y-6">
                {Object.entries(groupFieldsBySection(authConfig[tabKey])).map(([section, fields]) => (
                  <div key={section}>
                    <h5 className="font-medium mb-3 text-foreground">{section}</h5>
                    <div className="space-y-3">
                      {fields.map((field) => (
                        <FieldCard key={field.id} field={field} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {authConfig[tabKey]
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <FieldCard key={field.id} field={field} />
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Add Field Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-label">Field Label *</Label>
              <Input
                id="field-label"
                placeholder="Enter field label"
                value={newField.label || ''}
                onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-type">Field Type *</Label>
              <Select 
                value={newField.type || 'text'} 
                onValueChange={(value) => setNewField(prev => ({ ...prev, type: value as AuthFieldConfig['type'] }))}
              >
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
              <Label htmlFor="field-section">Section</Label>
              <Input
                id="field-section"
                placeholder="Enter section name (optional)"
                value={newField.section || ''}
                onChange={(e) => setNewField(prev => ({ ...prev, section: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                placeholder="Enter placeholder text"
                value={newField.placeholder || ''}
                onChange={(e) => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-description">Description</Label>
              <Textarea
                id="field-description"
                placeholder="Enter field description"
                value={newField.description || ''}
                onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            {newField.type === 'select' && (
              <div className="space-y-2">
                <Label htmlFor="field-options">Options (one per line)</Label>
                <Textarea
                  id="field-options"
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  value={newField.options?.join('\n') || ''}
                  onChange={(e) => setNewField(prev => ({ 
                    ...prev, 
                    options: e.target.value.split('\n').filter(option => option.trim()) 
                  }))}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Enter each option on a new line</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={newField.required || false} 
                  onCheckedChange={(checked) => setNewField(prev => ({ ...prev, required: checked }))}
                />
                <Label>Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={newField.visible !== false} 
                  onCheckedChange={(checked) => setNewField(prev => ({ ...prev, visible: checked }))}
                />
                <Label>Visible</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddField}>
                Add Field
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-field-label">Field Label *</Label>
                <Input
                  id="edit-field-label"
                  placeholder="Enter field label"
                  value={editingField.label}
                  onChange={(e) => setEditingField(prev => prev ? { ...prev, label: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-field-type">Field Type *</Label>
                <Select 
                  value={editingField.type} 
                  onValueChange={(value) => setEditingField(prev => prev ? { ...prev, type: value as AuthFieldConfig['type'] } : null)}
                  disabled={editingField.isCore}
                >
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
                {editingField.isCore && (
                  <p className="text-xs text-muted-foreground">Core fields cannot change type</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-field-section">Section</Label>
                <Input
                  id="edit-field-section"
                  placeholder="Enter section name"
                  value={editingField.section || ''}
                  onChange={(e) => setEditingField(prev => prev ? { ...prev, section: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-field-placeholder">Placeholder</Label>
                <Input
                  id="edit-field-placeholder"
                  placeholder="Enter placeholder text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-field-description">Description</Label>
                <Textarea
                  id="edit-field-description"
                  placeholder="Enter field description"
                  value={editingField.description || ''}
                  onChange={(e) => setEditingField(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                />
              </div>
              {editingField.type === 'select' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-field-options">Options (one per line)</Label>
                  <Textarea
                    id="edit-field-options"
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    value={editingField.options?.join('\n') || ''}
                    onChange={(e) => setEditingField(prev => prev ? { 
                      ...prev, 
                      options: e.target.value.split('\n').filter(option => option.trim()) 
                    } : null)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">Enter each option on a new line</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingField.required} 
                    onCheckedChange={(checked) => setEditingField(prev => prev ? { ...prev, required: checked } : null)}
                  />
                  <Label>Required</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingField.visible} 
                    onCheckedChange={(checked) => setEditingField(prev => prev ? { ...prev, visible: checked } : null)}
                  />
                  <Label>Visible</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingField(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (editingField) {
                    handleUpdateField(editingField.id, editingField);
                    setIsEditDialogOpen(false);
                    setEditingField(null);
                    toast({
                      title: 'Success',
                      description: 'Field updated successfully.',
                    });
                  }
                }}>
                  Update Field
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Preview</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign In Preview
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Sign Up Preview
              </TabsTrigger>
              <TabsTrigger value="memberUpdate" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Member Update Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In Form Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {authConfig.signin
                    .filter(field => field.visible)
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <PreviewField key={field.id} field={field} />
                    ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              {Object.entries(groupFieldsBySection(authConfig.signup.filter(f => f.visible)))
                .map(([section, fields]) => (
                  <Card key={section}>
                    <CardHeader>
                      <CardTitle className="text-lg">{section}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.map((field) => (
                        <PreviewField key={field.id} field={field} />
                      ))}
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="memberUpdate" className="space-y-4 mt-6">
              {Object.entries(groupFieldsBySection(authConfig.memberUpdate.filter(f => f.visible)))
                .map(([section, fields]) => (
                  <Card key={section}>
                    <CardHeader>
                      <CardTitle className="text-lg">{section}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.map((field) => (
                        <PreviewField key={field.id} field={field} />
                      ))}
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Preview Field Component
const PreviewField = ({ field }: { field: AuthFieldConfig }) => {
  const renderField = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea 
            placeholder={field.placeholder}
            className="min-h-[80px]"
            disabled
          />
        );
      case 'select':
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input type="checkbox" disabled className="rounded border-input" />
            <span className="text-sm">{field.label}</span>
          </div>
        );
      default:
        return (
          <Input 
            type={field.type}
            placeholder={field.placeholder}
            disabled
          />
        );
    }
  };

  if (field.type === 'checkbox') {
    return (
      <div className="space-y-2">
        {renderField()}
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {renderField()}
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
};