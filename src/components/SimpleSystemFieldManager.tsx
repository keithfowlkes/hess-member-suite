import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const [selectedField, setSelectedField] = useState<SystemField>(SYSTEM_FIELDS[0]);
  const [newValues, setNewValues] = useState<Record<SystemField, string>>({} as any);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAddOption = async () => {
    const value = newValues[selectedField]?.trim();
    if (!value) return;

    await addOption.mutateAsync({ fieldName: selectedField, optionValue: value });
    setNewValues(prev => ({ ...prev, [selectedField]: '' }));
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

  const selectedFieldOptions = getOptionsForField(selectedField);

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

      <div className="space-y-4">
        {/* Field Selector */}
        <div className="flex items-center gap-4">
          <Label htmlFor="field-selector" className="font-medium">
            Select Field Type:
          </Label>
          <Select value={selectedField} onValueChange={(value: SystemField) => setSelectedField(value)}>
            <SelectTrigger id="field-selector" className="w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {SYSTEM_FIELDS.map((field) => (
                <SelectItem key={field} value={field}>
                  {FIELD_LABELS[field]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Field Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{FIELD_LABELS[selectedField]}</span>
              <Badge variant="secondary">{selectedFieldOptions.length} options</Badge>
            </CardTitle>
            <CardDescription>
              Manage dropdown options for {FIELD_LABELS[selectedField].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new option */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="new-option">Add New Option</Label>
                <Input
                  id="new-option"
                  placeholder="Enter new option..."
                  value={newValues[selectedField] || ''}
                  onChange={(e) => setNewValues(prev => ({ ...prev, [selectedField]: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                />
              </div>
              <Button 
                onClick={handleAddOption}
                disabled={!newValues[selectedField]?.trim() || addOption.isPending}
                className="mt-6"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Existing options */}
            <div className="space-y-2">
              <Label>Current Options</Label>
              {selectedFieldOptions.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4 text-center border rounded-lg">
                  No options configured yet. Add options above to populate dropdown menus.
                </p>
              ) : (
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {selectedFieldOptions.map((option) => (
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
      </div>
    </div>
  );
}
