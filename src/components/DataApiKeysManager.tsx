import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Copy, Check, Trash2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

const FUNCTIONS_BASE = 'https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1';

const API_TYPES = [
  {
    id: 'organization_basic',
    label: 'Organization Basic (name, city, state, zip)',
    endpoint: `${FUNCTIONS_BASE}/org-directory-api`,
    description: 'Returns active member institutions with name, city, state and zip code only.',
  },
] as const;

interface ApiKeyRow {
  id: string;
  name: string;
  description: string | null;
  api_type: string;
  key_prefix: string;
  key_plain: string | null;
  is_active: boolean;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
}

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `hess_${hex}`;
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function DataApiKeysManager() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [apiType, setApiType] = useState<string>('organization_basic');
  const [createdKey, setCreatedKey] = useState<{ key: string; url: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data: keys, isLoading } = useQuery({
    queryKey: ['external-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ApiKeyRow[];
    },
    enabled: isAdmin,
  });

  const endpointFor = (type: string) =>
    API_TYPES.find((t) => t.id === type)?.endpoint ?? API_TYPES[0].endpoint;

  const createMutation = useMutation({
    mutationFn: async () => {
      const key = randomKey();
      const key_hash = await sha256Hex(key);
      const { error } = await supabase.from('external_api_keys').insert({
        name: name.trim(),
        description: description.trim() || null,
        api_type: apiType,
        key_prefix: key.slice(0, 12),
        key_hash,
        key_plain: key,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      return { key, url: `${endpointFor(apiType)}?key=${key}` };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['external-api-keys'] });
      setCreatedKey(result);
      setName('');
      setDescription('');
      toast.success('API key created');
    },
    onError: (e: any) => toast.error('Failed to create key: ' + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('external_api_keys')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-api-keys'] });
      toast.success('Key updated');
    },
    onError: (e: any) => toast.error('Failed to update key: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('external_api_keys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-api-keys'] });
      toast.success('Key revoked');
    },
    onError: (e: any) => toast.error('Failed to revoke key: ' + e.message),
  });

  const copy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard');
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Data API Keys
            </CardTitle>
            <CardDescription>
              Issue a secret key and URL that lets an external application read basic organization
              data (name, city, state, zip code) for active member institutions.
            </CardDescription>
          </div>
          <Button onClick={() => { setCreatedKey(null); setIsOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading keys…</p>
          ) : !keys?.length ? (
            <p className="text-sm text-muted-foreground">
              No API keys yet. Create one to give an external app access.
            </p>
          ) : (
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>
                      <div className="font-medium">{k.name}</div>
                      {k.description && (
                        <div className="text-xs text-muted-foreground">{k.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{k.api_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {k.key_plain ? (
                        <div className="flex items-center gap-1">
                          <span className="break-all">
                            {revealed[k.id] ? k.key_plain : `${k.key_prefix}${'•'.repeat(8)}`}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                          >
                            {revealed[k.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copy(k.key_plain!, `key-${k.id}`)}
                          >
                            {copied === `key-${k.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      ) : (
                        <span>{k.key_prefix}… (legacy, not recoverable)</span>
                      )}
                    </TableCell>
                    <TableCell>{k.request_count}</TableCell>
                    <TableCell className="text-xs">
                      {k.last_used_at ? format(new Date(k.last_used_at), 'MMM d, yyyy h:mm a') : '—'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={k.is_active}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: k.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Copy ready-to-use URL"
                        onClick={() =>
                          copy(
                            k.key_plain
                              ? `${endpointFor(k.api_type)}?key=${k.key_plain}`
                              : endpointFor(k.api_type),
                            `url-${k.id}`,
                          )
                        }
                      >
                        {copied === `url-${k.id}` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Revoke API key "${k.name}"? Apps using it will stop working.`)) {
                            deleteMutation.mutate(k.id);
                          }
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

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setCreatedKey(null); }}>
        <DialogContent className="max-w-lg">
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API key created</DialogTitle>
                <DialogDescription>
                  Copy this now. Admins can also view this key later in the keys table.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Secret key</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={createdKey.key} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(createdKey.key, 'new-key')}>
                      {copied === 'new-key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Ready-to-use URL</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={createdKey.url} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(createdKey.url, 'new-url')}>
                      {copied === 'new-url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The key can also be sent as an <code>x-api-key</code> header instead of the query string.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setIsOpen(false); setCreatedKey(null); }}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Generates a secret key and a URL for an external application.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Credentials Compass"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this key is used for"
                  />
                </div>
                <div className="space-y-1">
                  <Label>API type</Label>
                  <Select value={apiType} onValueChange={setApiType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {API_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {API_TYPES.find((t) => t.id === apiType)?.description}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!name.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create key'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
