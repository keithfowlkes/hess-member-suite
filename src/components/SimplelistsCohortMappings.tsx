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
import { useSimpleSystemFieldOptions } from '@/hooks/useSimpleSystemFieldOptions';

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
  
  const [newValue, setNewValue] = useState<string>('');
  const [newListName, setNewListName] = useState('');

  // Get cohort membership options from system_field_options
  const cohortOptions = fieldOptions
    .filter(o => o.field_name === 'cohort_membership' && o.option_value.toLowerCase() !== 'none')
    .map(o => o.option_value)
    .sort();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['simplelists-cohort-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simplelists_cohort_mappings')
        .select('*')
        .order('field_value');
      if (error) throw error;
      return data as CohortMapping[];
    },
  });

  const addMapping = useMutation({
    mutationFn: async () => {
      if (!newValue || !newListName.trim()) throw new Error('All fields required');
      const { error } = await supabase
        .from('simplelists_cohort_mappings')
        .insert({
          system_field: 'cohort_membership',
          field_value: newValue,
          simplelists_list_name: newListName.trim(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplelists-cohort-mappings'] });
      toast.success('Mapping added');
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

  // Filter out cohorts that already have a mapping
  const availableValues = cohortOptions.filter(
    v => !mappings.some(m => m.field_value.toLowerCase() === v.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Cohort-to-List Mappings
        </CardTitle>
        <CardDescription>
          Map Professional Cohort Memberships (e.g. "Ellucian Banner", "Workday") to specific Simplelists list names.
          When a member joins or leaves a cohort, they'll be automatically added to or removed from the mapped list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new mapping */}
        <div className="grid grid-cols-3 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Cohort Membership</Label>
            <Select value={newValue} onValueChange={setNewValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select cohort..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {availableValues.map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
                {availableValues.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">All cohorts mapped</div>
                )}
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
            disabled={!newValue || !newListName.trim() || addMapping.isPending}
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
                <TableHead>Cohort Membership</TableHead>
                <TableHead>Simplelists List</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm font-medium">{m.field_value}</TableCell>
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
