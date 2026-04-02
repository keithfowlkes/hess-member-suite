import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, Link2, Loader2 } from 'lucide-react';
import { useSimpleSystemFieldOptions, FIELD_LABELS, SYSTEM_FIELDS, type SystemField } from '@/hooks/useSimpleSystemFieldOptions';

// Only the system cohort fields relevant for list mapping
const COHORT_FIELDS: SystemField[] = [
  'student_information_system',
  'financial_system',
  'financial_aid',
  'hcm_hr',
  'payroll_system',
  'purchasing_system',
  'housing_management',
  'learning_management',
  'admissions_crm',
  'alumni_advancement_crm',
  'payment_platform',
  'meal_plan_management',
  'identity_management',
  'door_access',
  'document_management',
  'voip',
  'network_infrastructure',
];

interface CohortMapping {
  id: string;
  system_field: string;
  field_value: string;
  simplelists_list_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function SimplelistsCohortMappings() {
  const queryClient = useQueryClient();
  const { data: fieldOptions = [] } = useSimpleSystemFieldOptions();
  
  const [newField, setNewField] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newListName, setNewListName] = useState('');

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['simplelists-cohort-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simplelists_cohort_mappings')
        .select('*')
        .order('system_field, field_value');
      if (error) throw error;
      return data as CohortMapping[];
    },
  });

  const addMapping = useMutation({
    mutationFn: async () => {
      if (!newField || !newValue || !newListName.trim()) throw new Error('All fields required');
      const { error } = await supabase
        .from('simplelists_cohort_mappings')
        .insert({
          system_field: newField,
          field_value: newValue,
          simplelists_list_name: newListName.trim(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplelists-cohort-mappings'] });
      toast.success('Mapping added');
      setNewField('');
      setNewValue('');
      setNewListName('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMapping = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('simplelists_cohort_mappings')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simplelists-cohort-mappings'] }),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('simplelists_cohort_mappings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplelists-cohort-mappings'] });
      toast.success('Mapping removed');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Get options for the selected field
  const valuesForField = newField
    ? fieldOptions.filter(o => o.field_name === newField).map(o => o.option_value).sort()
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Cohort-to-List Mappings
        </CardTitle>
        <CardDescription>
          Map system field values (e.g. "Ellucian Banner" under Student Information System) to specific Simplelists list names.
          When a member is approved with a matching system value, they'll be added to the mapped list in addition to the primary list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new mapping */}
        <div className="grid grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">System Field</Label>
            <Select value={newField} onValueChange={(v) => { setNewField(v); setNewValue(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {COHORT_FIELDS.map(f => (
                  <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Field Value</Label>
            <Select value={newValue} onValueChange={setNewValue} disabled={!newField}>
              <SelectTrigger>
                <SelectValue placeholder={newField ? 'Select value...' : 'Pick field first'} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50 max-h-60">
                {valuesForField.map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Simplelists List Name</Label>
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="listname@domain.simplelists.com"
            />
          </div>
          <Button
            onClick={() => addMapping.mutate()}
            disabled={!newField || !newValue || !newListName.trim() || addMapping.isPending}
          >
            {addMapping.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add
          </Button>
        </div>

        {/* Existing mappings */}
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
            No cohort-to-list mappings configured yet. Add mappings above to auto-subscribe members to cohort-specific lists.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System Field</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Simplelists List</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm font-medium">
                    {FIELD_LABELS[m.system_field as SystemField] || m.system_field}
                  </TableCell>
                  <TableCell className="text-sm">{m.field_value}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline">{m.simplelists_list_name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={(checked) => toggleMapping.mutate({ id: m.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Remove this mapping?')) deleteMapping.mutate(m.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
