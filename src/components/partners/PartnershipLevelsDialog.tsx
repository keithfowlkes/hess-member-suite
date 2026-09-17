import { useState } from 'react';
import { Award, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PartnershipLevel,
  useDeletePartnershipLevel,
  usePartnershipLevels,
  useSavePartnershipLevel,
} from '@/hooks/usePartnershipLevels';

const styleOptions = [
  { value: 'default', label: 'Primary (solid)' },
  { value: 'secondary', label: 'Secondary (soft)' },
  { value: 'outline', label: 'Outline' },
];

export function PartnershipLevelsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: levels = [] } = usePartnershipLevels();
  const saveLevel = useSavePartnershipLevel();
  const deleteLevel = useDeletePartnershipLevel();

  const [newName, setNewName] = useState('');
  const [newStyle, setNewStyle] = useState('default');

  const addLevel = async () => {
    if (!newName.trim()) return;
    await saveLevel.mutateAsync({
      name: newName.trim().slice(0, 100),
      badge_style: newStyle as PartnershipLevel['badge_style'],
      display_order: levels.length + 1,
      is_active: true,
    });
    setNewName('');
    setNewStyle('default');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Partnership Levels
          </DialogTitle>
          <DialogDescription>
            Levels appear as a badge on partner cards and partner detail pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {levels.map((level) => (
            <div
              key={level.id}
              className={`rounded-md border p-3 space-y-3 ${
                level.is_highlighted ? 'border-primary/50 bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={level.badge_style as any} className="gap-1">
                  <Award className="h-3 w-3" />
                  {level.name}
                </Badge>
                {level.is_highlighted && (
                  <span className="text-xs font-medium text-primary flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Highlighted in directories
                  </span>
                )}
                {!level.is_active && <span className="text-xs text-muted-foreground">Inactive</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <Input
                  defaultValue={level.name}
                  maxLength={100}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== level.name) {
                      saveLevel.mutate({ id: level.id, name: value });
                    }
                  }}
                />
                <Select
                  value={level.badge_style}
                  onValueChange={(value) =>
                    saveLevel.mutate({ id: level.id, name: level.name, badge_style: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {styleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={level.is_active}
                    onCheckedChange={(checked) =>
                      saveLevel.mutate({ id: level.id, name: level.name, is_active: checked })
                    }
                  />
                  <Label className="text-sm font-normal">Available for assignment</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteLevel.mutate(level.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <Switch
                  checked={!!level.is_highlighted}
                  onCheckedChange={(checked) =>
                    saveLevel.mutate({
                      id: level.id,
                      name: level.name,
                      is_highlighted: checked,
                    })
                  }
                />
                <Label className="text-sm font-normal">
                  Highlight partners at this level in directory views
                </Label>
              </div>
            </div>
          ))}

          <div className="rounded-md border border-dashed border-border p-3 space-y-3">
            <Label>Add a new level</Label>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <Input
                value={newName}
                maxLength={100}
                placeholder="e.g. Premier Partner"
                onChange={(e) => setNewName(e.target.value)}
              />
              <Select value={newStyle} onValueChange={setNewStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {styleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addLevel} disabled={!newName.trim() || saveLevel.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
