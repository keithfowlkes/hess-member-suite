import { useState, useEffect } from 'react';
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
import { Settings2, Save, RotateCcw, Plus, Edit, Trash2 } from 'lucide-react';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'password';
  section: string;
  visibility: 'required' | 'optional' | 'hidden';
  placeholder?: string;
  description?: string;
}

const defaultFormFields: FormField[] = [
  // Organization Information
  { id: 'organization', name: 'organization', label: 'Organization', type: 'text', section: 'Organization Information', visibility: 'required', placeholder: 'Organization name' },
  { id: 'stateAssociation', name: 'stateAssociation', label: 'State Association', type: 'text', section: 'Organization Information', visibility: 'optional', placeholder: 'State association' },
  { id: 'studentFte', name: 'studentFte', label: 'Student FTE', type: 'number', section: 'Organization Information', visibility: 'optional', placeholder: 'Student FTE' },
  { id: 'address', name: 'address', label: 'Address', type: 'text', section: 'Organization Information', visibility: 'optional', placeholder: 'Street address' },
  { id: 'city', name: 'city', label: 'City', type: 'text', section: 'Organization Information', visibility: 'optional', placeholder: 'City' },
  { id: 'state', name: 'state', label: 'State', type: 'text', section: 'Organization Information', visibility: 'optional', placeholder: 'State' },
  { id: 'zip', name: 'zip', label: 'ZIP Code', type: 'text', section: 'Organization Information', visibility: 'optional', placeholder: 'ZIP code' },

  // Primary Contact
  { id: 'firstName', name: 'firstName', label: 'First Name - Primary Contact', type: 'text', section: 'Primary Contact', visibility: 'required', placeholder: 'First name' },
  { id: 'lastName', name: 'lastName', label: 'Last Name - Primary Contact', type: 'text', section: 'Primary Contact', visibility: 'required', placeholder: 'Last name' },
  { id: 'primaryContactTitle', name: 'primaryContactTitle', label: 'Primary Contact Title', type: 'text', section: 'Primary Contact', visibility: 'optional', placeholder: 'Job title' },
  { id: 'email', name: 'email', label: 'Primary Email', type: 'email', section: 'Primary Contact', visibility: 'required', placeholder: 'Enter your email' },
  { id: 'password', name: 'password', label: 'Password', type: 'password', section: 'Primary Contact', visibility: 'required', placeholder: 'Create a password' },

  // Secondary Contact
  { id: 'secondaryFirstName', name: 'secondaryFirstName', label: 'First Name - Secondary Contact', type: 'text', section: 'Secondary Contact', visibility: 'optional', placeholder: 'First name' },
  { id: 'secondaryLastName', name: 'secondaryLastName', label: 'Last Name - Secondary Contact', type: 'text', section: 'Secondary Contact', visibility: 'optional', placeholder: 'Last name' },
  { id: 'secondaryContactTitle', name: 'secondaryContactTitle', label: 'Secondary Contact Title', type: 'text', section: 'Secondary Contact', visibility: 'optional', placeholder: 'Job title' },
  { id: 'secondaryContactEmail', name: 'secondaryContactEmail', label: 'Secondary Contact Email', type: 'email', section: 'Secondary Contact', visibility: 'optional', placeholder: 'Secondary contact email' },

  // Systems Information
  { id: 'studentInformationSystem', name: 'studentInformationSystem', label: 'Student Information System', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Student information system' },
  { id: 'financialSystem', name: 'financialSystem', label: 'Financial System', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Financial system' },
  { id: 'financialAid', name: 'financialAid', label: 'Financial Aid', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Financial aid system' },
  { id: 'hcmHr', name: 'hcmHr', label: 'HCM (HR)', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'HCM/HR system' },
  { id: 'payrollSystem', name: 'payrollSystem', label: 'Payroll System', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Payroll system' },
  { id: 'purchasingSystem', name: 'purchasingSystem', label: 'Purchasing System', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Purchasing system' },
  { id: 'housingManagement', name: 'housingManagement', label: 'Housing Management', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Housing management system' },
  { id: 'learningManagement', name: 'learningManagement', label: 'Learning Management', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Learning management system' },
  { id: 'admissionsCrm', name: 'admissionsCrm', label: 'Admissions CRM', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Admissions CRM system' },
  { id: 'alumniAdvancementCrm', name: 'alumniAdvancementCrm', label: 'Alumni/Advancement CRM', type: 'text', section: 'Systems Information', visibility: 'optional', placeholder: 'Alumni/Advancement CRM system' },
];

const availableSections = [
  'Organization Information',
  'Primary Contact', 
  'Secondary Contact',
  'Systems Information'
];

export default function FormFields() {
  const [formFields, setFormFields] = useState<FormField[]>(defaultFormFields);
  const [hasChanges, setHasChanges] = useState(false);
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

  const updateFieldVisibility = (fieldId: string, visibility: 'required' | 'optional' | 'hidden') => {
    setFormFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, visibility } : field
    ));
    setHasChanges(true);
  };

  const handleAddField = (newField: Omit<FormField, 'id'>) => {
    const field: FormField = {
      ...newField,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setFormFields(prev => [...prev, field]);
    setHasChanges(true);
    setIsAddDialogOpen(false);
    toast({
      title: 'Field Added',
      description: `"${field.label}" has been added to the form.`,
    });
  };

  const handleEditField = (updatedField: FormField) => {
    setFormFields(prev => prev.map(field => 
      field.id === updatedField.id ? updatedField : field
    ));
    setHasChanges(true);
    setIsEditDialogOpen(false);
    setEditingField(null);
    toast({
      title: 'Field Updated',
      description: `"${updatedField.label}" has been updated.`,
    });
  };

  const handleDeleteField = (fieldId: string) => {
    const field = formFields.find(f => f.id === fieldId);
    setFormFields(prev => prev.filter(field => field.id !== fieldId));
    setHasChanges(true);
    toast({
      title: 'Field Deleted',
      description: `"${field?.label}" has been removed from the form.`,
    });
  };

  const handleSave = () => {
    // In a real implementation, this would save to the database
    toast({
      title: 'Settings Saved',
      description: 'Form field configurations have been updated successfully.',
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setFormFields(defaultFormFields);
    setHasChanges(false);
    toast({
      title: 'Settings Reset',
      description: 'Form field configurations have been reset to defaults.',
    });
  };

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
                  disabled={!hasChanges}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={!hasChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>

            {hasChanges && (
              <div className="bg-yellow-500/10 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  You have unsaved changes. Don't forget to save your configuration.
                </p>
              </div>
            )}

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
                                <h4 className="font-medium text-foreground">{field.label}</h4>
                                <Badge className={getVisibilityColor(field.visibility)}>
                                  {field.visibility}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {field.placeholder}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>Field Name: {field.name}</span>
                                <span>•</span>
                                <span>Type: {field.type}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Select
                                value={field.visibility}
                                onValueChange={(value: 'required' | 'optional' | 'hidden') => 
                                  updateFieldVisibility(field.id, value)
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
                                        Are you sure you want to delete "{field.label}"? This action cannot be undone.
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
  onSubmit: (field: Omit<FormField, 'id'>) => void;
  defaultSection: string;
}) {
  const [field, setField] = useState<Omit<FormField, 'id'>>({
    name: '',
    label: '',
    type: 'text',
    section: defaultSection,
    visibility: 'optional',
    placeholder: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (field.name && field.label) {
      onSubmit(field);
      setField({
        name: '',
        label: '',
        type: 'text',
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
          value={field.name}
          onChange={(e) => setField(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., organizationType"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-label">Field Label</Label>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => setField(prev => ({ ...prev, label: e.target.value }))}
          placeholder="e.g., Organization Type"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field-type">Field Type</Label>
        <Select value={field.type} onValueChange={(value: 'text' | 'email' | 'number' | 'password') => 
          setField(prev => ({ ...prev, type: value }))
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
    if (editedField.name && editedField.label) {
      onSubmit(editedField);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-field-name">Field Name</Label>
        <Input
          id="edit-field-name"
          value={editedField.name}
          onChange={(e) => setEditedField(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-label">Field Label</Label>
        <Input
          id="edit-field-label"
          value={editedField.label}
          onChange={(e) => setEditedField(prev => ({ ...prev, label: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-field-type">Field Type</Label>
        <Select value={editedField.type} onValueChange={(value: 'text' | 'email' | 'number' | 'password') => 
          setEditedField(prev => ({ ...prev, type: value }))
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