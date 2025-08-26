import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useFormFields, FormField } from '@/hooks/useFormFields';
import { Settings2, Save, RotateCcw, Plus, Edit, Trash2, Loader2 } from 'lucide-react';

const availableSections = [
  'Organization Information',
  'Primary Contact', 
  'Secondary Contact',
  'Systems Information'
];

export default function FormFields() {
  const { 
    formFields, 
    loading, 
    updateFieldVisibility, 
    createFormField, 
    updateFormField, 
    deleteFormField, 
    resetToDefaults 
  } = useFormFields();
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const sections = Array.from(new Set(formFields.map(field => field.section)));
  
  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'required': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'optional': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'hidden': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const handleFieldVisibilityChange = async (fieldId: string, visibility: 'required' | 'optional' | 'hidden') => {
    try {
      await updateFieldVisibility(fieldId, visibility);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleAddField = async (newField: Omit<FormField, 'id' | 'field_id' | 'display_order' | 'is_custom'>) => {
    try {
      await createFormField({
        ...newField,
        field_id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        field_name: newField.field_label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        is_custom: true
      });
      setIsAddDialogOpen(false);
      toast({
        title: 'Field Added',
        description: `"${newField.field_label}" has been added to the form.`,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEditField = async (updatedField: FormField) => {
    try {
      await updateFormField(updatedField.id, {
        field_name: updatedField.field_name,
        field_label: updatedField.field_label,
        field_type: updatedField.field_type,
        section: updatedField.section,
        visibility: updatedField.visibility,
        placeholder: updatedField.placeholder,
        description: updatedField.description
      });
      setIsEditDialogOpen(false);
      setEditingField(null);
      toast({
        title: 'Field Updated',
        description: `"${updatedField.field_label}" has been updated.`,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    const field = formFields.find(f => f.id === fieldId);
    try {
      await deleteFormField(fieldId);
      toast({
        title: 'Field Deleted',
        description: `"${field?.field_label}" has been removed from the form.`,
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading form field configurations...</span>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Registration Forms</h1>
                <p className="text-muted-foreground mt-2">
                  Configure which fields are shown on the member registration form and whether they are required
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              {sections.map(section => {
                const sectionFields = formFields.filter(field => field.section === section);
                
                return (
                  <Card key={section}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                          <Settings2 className="h-5 w-5" />
                          {section}
                        </CardTitle>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Field
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add New Field</DialogTitle>
                            </DialogHeader>
                            <AddFieldForm 
                              onSubmit={handleAddField}
                              defaultSection={section}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {sectionFields.map(field => (
                        <div key={field.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium text-foreground">{field.field_label}</h4>
                              <Badge className={getVisibilityColor(field.visibility)}>
                                {field.visibility}
                              </Badge>
                              {field.is_custom && (
                                <Badge variant="outline" className="text-xs">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {field.placeholder}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>Field Name: {field.field_name}</span>
                              <span>•</span>
                              <span>Type: {field.field_type}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Select
                              value={field.visibility}
                              onValueChange={(value: 'required' | 'optional' | 'hidden') => 
                                handleFieldVisibilityChange(field.id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="required">Required</SelectItem>
                                <SelectItem value="optional">Optional</SelectItem>
                                <SelectItem value="hidden">Hidden</SelectItem>
                              </SelectContent>
                            </Select>
                              <div className="flex gap-2">
                                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setEditingField(field)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Field</DialogTitle>
                                    </DialogHeader>
                                    {editingField && (
                                      <EditFieldForm 
                                        field={editingField}
                                        onSubmit={handleEditField}
                                      />
                                    )}
                                  </DialogContent>
                                </Dialog>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Field</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{field.field_label}"? This action cannot be undone.
                                </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteField(field.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Summary Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formFields.filter(f => f.visibility === 'required').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Required Fields</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formFields.filter(f => f.visibility === 'optional').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Optional Fields</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {formFields.filter(f => f.visibility === 'hidden').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Hidden Fields</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function AddFieldForm({ onSubmit, defaultSection }: { 
  onSubmit: (field: Omit<FormField, 'id' | 'field_id' | 'display_order' | 'is_custom'>) => void;
  defaultSection: string;
}) {
  const [field, setField] = useState<Omit<FormField, 'id' | 'field_id' | 'display_order' | 'is_custom'>>({
    field_name: '',
    field_label: '',
    field_type: 'text',
    section: defaultSection,
    visibility: 'optional',
    placeholder: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (field.field_name && field.field_label) {
      onSubmit(field);
      setField({
        field_name: '',
        field_label: '',
        field_type: 'text',
        section: defaultSection,
        visibility: 'optional',
        placeholder: ''
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="field-name">Field Name</Label>
        <Input
          id="field-name"
          value={field.field_name}
          onChange={(e) => setField(prev => ({ ...prev, field_name: e.target.value }))}
          placeholder="e.g., organizationType"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-label">Field Label</Label>
        <Input
          id="field-label"
          value={field.field_label}
          onChange={(e) => setField(prev => ({ ...prev, field_label: e.target.value }))}
          placeholder="e.g., Organization Type"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-type">Field Type</Label>
        <Select value={field.field_type} onValueChange={(value: 'text' | 'email' | 'number' | 'password') => 
          setField(prev => ({ ...prev, field_type: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="password">Password</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-section">Section</Label>
        <Select value={field.section} onValueChange={(value) => 
          setField(prev => ({ ...prev, section: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableSections.map(section => (
              <SelectItem key={section} value={section}>{section}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-visibility">Visibility</Label>
        <Select value={field.visibility} onValueChange={(value: 'required' | 'optional' | 'hidden') => 
          setField(prev => ({ ...prev, visibility: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="required">Required</SelectItem>
            <SelectItem value="optional">Optional</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-placeholder">Placeholder</Label>
        <Input
          id="field-placeholder"
          value={field.placeholder}
          onChange={(e) => setField(prev => ({ ...prev, placeholder: e.target.value }))}
          placeholder="e.g., Enter organization type"
        />
      </div>
      <Button type="submit" className="w-full">Add Field</Button>
    </form>
  );
}

function EditFieldForm({ field, onSubmit }: { 
  field: FormField;
  onSubmit: (field: FormField) => void;
}) {
  const [editedField, setEditedField] = useState<FormField>(field);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedField.field_name && editedField.field_label) {
      onSubmit(editedField);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-field-name">Field Name</Label>
        <Input
          id="edit-field-name"
          value={editedField.field_name}
          onChange={(e) => setEditedField(prev => ({ ...prev, field_name: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-label">Field Label</Label>
        <Input
          id="edit-field-label"
          value={editedField.field_label}
          onChange={(e) => setEditedField(prev => ({ ...prev, field_label: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-type">Field Type</Label>
        <Select value={editedField.field_type} onValueChange={(value: 'text' | 'email' | 'number' | 'password') => 
          setEditedField(prev => ({ ...prev, field_type: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="password">Password</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-section">Section</Label>
        <Select value={editedField.section} onValueChange={(value) => 
          setEditedField(prev => ({ ...prev, section: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableSections.map(section => (
              <SelectItem key={section} value={section}>{section}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-visibility">Visibility</Label>
        <Select value={editedField.visibility} onValueChange={(value: 'required' | 'optional' | 'hidden') => 
          setEditedField(prev => ({ ...prev, visibility: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="required">Required</SelectItem>
            <SelectItem value="optional">Optional</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-placeholder">Placeholder</Label>
        <Input
          id="edit-field-placeholder"
          value={editedField.placeholder || ''}
          onChange={(e) => setEditedField(prev => ({ ...prev, placeholder: e.target.value }))}
          placeholder="e.g., Enter organization type"
        />
      </div>
      <Button type="submit" className="w-full">Update Field</Button>
    </form>
  );
}