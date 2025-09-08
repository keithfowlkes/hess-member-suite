import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { 
  useSimpleSystemFieldOptions,
  useAddSimpleSystemFieldOption,
  useUpdateSimpleSystemFieldOption,
  useDeleteSimpleSystemFieldOption,
  SYSTEM_FIELDS,
  FIELD_LABELS,
  type SystemField 
} from '@/hooks/useSimpleSystemFieldOptions';

export function SimpleSystemFieldManager() {
  const { data: options = [], isLoading } = useSimpleSystemFieldOptions();
  const addOption = useAddSimpleSystemFieldOption();
  const updateOption = useUpdateSimpleSystemFieldOption();
  const deleteOption = useDeleteSimpleSystemFieldOption();

  const [newValues, setNewValues] = useState<Record<SystemField, string>>({} as any);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAddOption = async (fieldName: SystemField) => {
    const value = newValues[fieldName]?.trim();
    if (!value) return;

    await addOption.mutateAsync({ fieldName, optionValue: value });
    setNewValues(prev => ({ ...prev, [fieldName]: '' }));
  };

  const handleStartEdit = (id: string, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return;

    await updateOption.mutateAsync({ id: editingId, optionValue: editValue });
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDeleteOption = async (id: string) => {
    if (confirm('Are you sure you want to delete this option?')) {
      await deleteOption.mutateAsync(id);
    }
  };

  const getOptionsForField = (fieldName: SystemField) => {
    return options.filter(opt => opt.field_name === fieldName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Field Options</h2>
        <p className="text-muted-foreground">
          Configure dropdown options that appear in organization profiles and registration forms.
        </p>
      </div>

      <Tabs defaultValue={SYSTEM_FIELDS[0]} className="w-full">
        <div className="grid grid-cols-2 gap-2">
          <TabsList className="grid w-full grid-cols-5 gap-1">
            {SYSTEM_FIELDS.slice(0, 5).map((field) => (
              <TabsTrigger key={field} value={field} className="text-xs p-2">
                {FIELD_LABELS[field].split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsList className="grid w-full grid-cols-5 gap-1">
            {SYSTEM_FIELDS.slice(5).map((field) => (
              <TabsTrigger key={field} value={field} className="text-xs p-2">
                {FIELD_LABELS[field].split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {SYSTEM_FIELDS.map((field) => {
          const fieldOptions = getOptionsForField(field);
          
          return (
            <TabsContent key={field} value={field}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{FIELD_LABELS[field]}</span>
                    <Badge variant="secondary">{fieldOptions.length} options</Badge>
                  </CardTitle>
                  <CardDescription>
                    Manage dropdown options for {FIELD_LABELS[field].toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add new option */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`new-${field}`}>Add New Option</Label>
                      <Input
                        id={`new-${field}`}
                        placeholder="Enter new option..."
                        value={newValues[field] || ''}
                        onChange={(e) => setNewValues(prev => ({ ...prev, [field]: e.target.value }))}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddOption(field)}
                      />
                    </div>
                    <Button 
                      onClick={() => handleAddOption(field)}
                      disabled={!newValues[field]?.trim() || addOption.isPending}
                      className="mt-6"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {/* Existing options */}
                  <div className="space-y-2">
                    <Label>Current Options</Label>
                    {fieldOptions.length === 0 ? (
                      <p className="text-muted-foreground text-sm p-4 text-center border rounded-lg">
                        No options configured yet. Add options above to populate dropdown menus.
                      </p>
                    ) : (
                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {fieldOptions.map((option) => (
                          <div key={option.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                            {editingId === option.id ? (
                              <>
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="flex-1"
                                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleSaveEdit}
                                  disabled={updateOption.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 font-medium">{option.option_value}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartEdit(option.id, option.option_value)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteOption(option.id)}
                                  disabled={deleteOption.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
