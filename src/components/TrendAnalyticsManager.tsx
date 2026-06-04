import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TrendEntry {
  id: string;
  title: string;
  analytic_key: string;
  description: string | null;
  display_order: number;
  enabled: boolean;
}

export const ANALYTIC_TYPES: { key: string; label: string }[] = [
  { key: 'org_size_erp', label: 'Organization Size vs ERP System Choice' },
  { key: 'org_size_lms', label: 'Organization Size vs LMS Choice' },
  { key: 'org_size_financial', label: 'Organization Size vs Financial System Choice' },
  { key: 'hess_enrollment', label: 'HESS Member Institution Enrollment Trends' },
];

export function useTrendEntries() {
  return useQuery({
    queryKey: ['trend-analytics-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trend_analytics_entries' as any)
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data as unknown as TrendEntry[]) || [];
    },
  });
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function TrendAnalyticsManager({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { data: entries = [] } = useTrendEntries();
  const [editing, setEditing] = useState<TrendEntry | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = useMutation({
    mutationFn: async (e: Partial<TrendEntry> & { id?: string }) => {
      if (e.id) {
        const { error } = await supabase
          .from('trend_analytics_entries' as any)
          .update({
            title: e.title,
            analytic_key: e.analytic_key,
            description: e.description,
            display_order: e.display_order,
            enabled: e.enabled,
          })
          .eq('id', e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trend_analytics_entries' as any)
          .insert({
            title: e.title,
            analytic_key: e.analytic_key,
            description: e.description,
            display_order: e.display_order ?? (entries.length + 1) * 10,
            enabled: e.enabled ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trend-analytics-entries'] });
      toast.success('Saved');
      setEditing(null);
      setIsNew(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trend_analytics_entries' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trend-analytics-entries'] });
      toast.success('Deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const startNew = () => {
    setIsNew(true);
    setEditing({
      id: '',
      title: '',
      analytic_key: ANALYTIC_TYPES[0].key,
      description: '',
      display_order: (entries.length + 1) * 10,
      enabled: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Trend Analytics</DialogTitle>
          <DialogDescription>
            Add, edit, reorder, or remove analytics shown in the Trend Analytics tab.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="e.g. Organization Size vs ERP System Choice"
              />
            </div>
            <div className="space-y-2">
              <Label>Analytic Type</Label>
              <Select
                value={editing.analytic_key}
                onValueChange={(v) => setEditing({ ...editing, analytic_key: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANALYTIC_TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The underlying chart/visualization that will render in this accordion.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editing.description ?? ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={editing.display_order}
                  onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Enabled</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={editing.enabled}
                    onCheckedChange={(c) => setEditing({ ...editing, enabled: c })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {editing.enabled ? 'Visible to members' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => { setEditing(null); setIsNew(false); }}>
                Cancel
              </Button>
              <Button
                onClick={() => save.mutate(isNew ? { ...editing, id: undefined } : editing)}
                disabled={!editing.title.trim() || save.isPending}
              >
                {save.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={startNew}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Analytic
              </Button>
            </div>
            <ScrollArea className="max-h-[400px] pr-2">
              <div className="space-y-2">
                {entries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No analytics configured.
                  </p>
                )}
                {entries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 p-3 rounded-md border bg-card"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {ANALYTIC_TYPES.find((t) => t.key === e.analytic_key)?.label ?? e.analytic_key}
                        {' · order '}{e.display_order}
                        {!e.enabled && ' · hidden'}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => { setIsNew(false); setEditing(e); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${e.title}"?`)) del.mutate(e.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
