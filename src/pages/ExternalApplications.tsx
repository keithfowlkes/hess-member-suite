import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ExternalLink, Shield, Activity, Copy, Check, Mail, RefreshCw, Wifi, WifiOff, Users, Loader2 } from 'lucide-react';
import { SimplelistsCohortMappings } from '@/components/SimplelistsCohortMappings';
import { format } from 'date-fns';

interface ExternalApplication {
  id: string;
  name: string;
  description: string | null;
  app_url: string;
  app_identifier: string;
  allowed_scopes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AccessLog {
  id: string;
  app_id: string;
  user_id: string;
  action: string;
  scopes_requested: string[];
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const AVAILABLE_SCOPES = [
  { id: 'profile:read', label: 'Profile', description: 'Read user profile information' },
  { id: 'organization:read', label: 'Organization', description: 'Read organization details' },
  { id: 'organization:systems', label: 'Systems', description: 'Read software/system information' },
  { id: 'roles:read', label: 'Roles', description: 'Read user roles' },
  { id: 'cohorts:read', label: 'Cohorts', description: 'Read cohort memberships' },
  { id: 'fees:notify', label: 'Fee Notifications', description: 'Receive payment status updates' },
];

export function ExternalApplicationsContent() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ExternalApplication | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Simplelists state
  const [slEnabled, setSlEnabled] = useState(false);
  const [slListName, setSlListName] = useState('');
  const [slSyncSecondary, setSlSyncSecondary] = useState(false);
  const [slTesting, setSlTesting] = useState(false);
  const [slConnectionStatus, setSlConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [slSyncing, setSlSyncing] = useState(false);
  const [slSaving, setSlSaving] = useState(false);
  
  // Conference Hub fee notifications state
  const [chFeeNotifications, setChFeeNotifications] = useState(false);
  const [chSaving, setChSaving] = useState(false);

  const [newApp, setNewApp] = useState({
    name: '',
    description: '',
    app_url: '',
    app_identifier: '',
    allowed_scopes: ['profile:read', 'organization:read', 'roles:read'] as string[],
    is_active: true
  });

  // Fetch external applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ['external-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_applications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ExternalApplication[];
    },
    enabled: isAdmin
  });

  // Fetch access logs
  const { data: accessLogs } = useQuery({
    queryKey: ['external-app-access-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_app_access_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as AccessLog[];
    },
    enabled: isAdmin
  });

  // Add application mutation
  const addAppMutation = useMutation({
    mutationFn: async (app: typeof newApp) => {
      const { data, error } = await supabase
        .from('external_applications')
        .insert({
          ...app,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-applications'] });
      toast.success('Application registered successfully');
      setIsAddDialogOpen(false);
      setNewApp({
        name: '',
        description: '',
        app_url: '',
        app_identifier: '',
        allowed_scopes: ['profile:read', 'organization:read', 'roles:read'],
        is_active: true
      });
    },
    onError: (error: any) => {
      toast.error('Failed to register application: ' + error.message);
    }
  });

  // Update application mutation
  const updateAppMutation = useMutation({
    mutationFn: async (app: ExternalApplication) => {
      const { data, error } = await supabase
        .from('external_applications')
        .update({
          name: app.name,
          description: app.description,
          app_url: app.app_url,
          allowed_scopes: app.allowed_scopes,
          is_active: app.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', app.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-applications'] });
      toast.success('Application updated successfully');
      setEditingApp(null);
    },
    onError: (error: any) => {
      toast.error('Failed to update application: ' + error.message);
    }
  });

  // Delete application mutation
  const deleteAppMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('external_applications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-applications'] });
      toast.success('Application deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete application: ' + error.message);
    }
  });

  const handleCopyIdentifier = async (identifier: string) => {
    await navigator.clipboard.writeText(identifier);
    setCopiedId(identifier);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleScope = (scopeId: string, isNew: boolean = true) => {
    if (isNew) {
      setNewApp(prev => ({
        ...prev,
        allowed_scopes: prev.allowed_scopes.includes(scopeId)
          ? prev.allowed_scopes.filter(s => s !== scopeId)
          : [...prev.allowed_scopes, scopeId]
      }));
    } else if (editingApp) {
      setEditingApp(prev => prev ? ({
        ...prev,
        allowed_scopes: prev.allowed_scopes.includes(scopeId)
          ? prev.allowed_scopes.filter(s => s !== scopeId)
          : [...prev.allowed_scopes, scopeId]
      }) : null);
    }
  };

  // Fetch Simplelists settings
  const { data: slSettings, isLoading: slSettingsLoading } = useQuery({
    queryKey: ['simplelists-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('simplelists-sync', {
        body: { action: 'get_settings' }
      });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  // Fetch Simplelists sync logs
  const { data: syncLogs, isLoading: syncLogsLoading } = useQuery({
    queryKey: ['simplelists-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simplelists_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  // Fetch Conference Hub fee notification setting
  const { data: chFeeSetting } = useQuery({
    queryKey: ['conference-hub-fee-setting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'conference_hub_fee_notifications')
        .maybeSingle();
      if (error) throw error;
      return data?.setting_value === 'true';
    },
    enabled: isAdmin
  });

  // Update local state when settings load
  useEffect(() => {
    if (slSettings && !slSettingsLoading) {
      setSlEnabled(slSettings.enabled);
      setSlListName(slSettings.list_name || '');
      setSlSyncSecondary(slSettings.sync_secondary);
    }
  }, [slSettings, slSettingsLoading]);

  useEffect(() => {
    if (chFeeSetting !== undefined) {
      setChFeeNotifications(chFeeSetting);
    }
  }, [chFeeSetting]);

  const handleSlTestConnection = async () => {
    setSlTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('simplelists-sync', {
        body: { action: 'test_connection' }
      });
      if (error) throw error;
      if (data?.connected) {
        setSlConnectionStatus('connected');
        toast.success('Successfully connected to Simplelists API');
      } else {
        setSlConnectionStatus('error');
        toast.error('Connection failed: ' + (data?.message || 'Unknown error'));
      }
    } catch (err: any) {
      setSlConnectionStatus('error');
      toast.error('Connection test failed: ' + err.message);
    } finally {
      setSlTesting(false);
    }
  };

  const handleSlSaveSettings = async () => {
    setSlSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('simplelists-sync', {
        body: { action: 'update_settings', enabled: slEnabled, list_name: slListName, sync_secondary: slSyncSecondary }
      });
      if (error) throw error;
      toast.success('Simplelists settings saved');
      queryClient.invalidateQueries({ queryKey: ['simplelists-settings'] });
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSlSaving(false);
    }
  };

  const handleSlSyncAll = async () => {
    if (!confirm('This will add all active member contacts to your Simplelists list. Continue?')) return;
    setSlSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('simplelists-sync', {
        body: { action: 'sync_all_members' }
      });
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} contacts to Simplelists`);
      queryClient.invalidateQueries({ queryKey: ['simplelists-sync-logs'] });
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSlSyncing(false);
    }
  };

  const handleChSaveFeeNotifications = async () => {
    setChSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'conference_hub_fee_notifications',
          setting_value: chFeeNotifications ? 'true' : 'false',
          description: 'Enable sending payment status notifications to Conference Hub'
        }, { onConflict: 'setting_key' });
      if (error) throw error;
      toast.success('Conference Hub fee notification setting saved');
      queryClient.invalidateQueries({ queryKey: ['conference-hub-fee-setting'] });
    } catch (err: any) {
      toast.error('Failed to save setting: ' + err.message);
    } finally {
      setChSaving(false);
    }
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">External Applications</h1>
              <p className="text-muted-foreground">
                Manage external Lovable projects that can authenticate against this member portal
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Application
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Register External Application</DialogTitle>
                  <DialogDescription>
                    Register a new Lovable project to use this portal for authentication
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Application Name</Label>
                      <Input
                        id="name"
                        value={newApp.name}
                        onChange={(e) => setNewApp(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Conference Hub"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="identifier">Unique Identifier</Label>
                      <Input
                        id="identifier"
                        value={newApp.app_identifier}
                        onChange={(e) => setNewApp(prev => ({ ...prev, app_identifier: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                        placeholder="conference-hub"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">Application URL</Label>
                    <Input
                      id="url"
                      value={newApp.app_url}
                      onChange={(e) => setNewApp(prev => ({ ...prev, app_url: e.target.value }))}
                      placeholder="https://my-app.lovable.app"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newApp.description}
                      onChange={(e) => setNewApp(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the application"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowed Scopes</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_SCOPES.map(scope => (
                        <div key={scope.id} className="flex items-center space-x-2 p-2 border rounded">
                          <Switch
                            checked={newApp.allowed_scopes.includes(scope.id)}
                            onCheckedChange={() => toggleScope(scope.id, true)}
                          />
                          <div>
                            <p className="text-sm font-medium">{scope.label}</p>
                            <p className="text-xs text-muted-foreground">{scope.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => addAppMutation.mutate(newApp)}
                    disabled={!newApp.name || !newApp.app_identifier || !newApp.app_url}
                  >
                    Register Application
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="applications" className="space-y-4">
            <TabsList>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="simplelists">
                <Mail className="h-4 w-4 mr-1" />
                Simplelists
              </TabsTrigger>
              <TabsTrigger value="logs">Access Logs</TabsTrigger>
              <TabsTrigger value="integration">Integration Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {applications?.map(app => (
                    <Card key={app.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${app.is_active ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
                              <Shield className={`h-5 w-5 ${app.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {app.name}
                                <Badge variant={app.is_active ? 'default' : 'secondary'}>
                                  {app.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{app.app_identifier}</code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleCopyIdentifier(app.app_identifier)}
                                >
                                  {copiedId === app.app_identifier ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <a href={app.app_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditingApp(app)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this application?')) {
                                  deleteAppMutation.mutate(app.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {app.description && (
                          <p className="text-sm text-muted-foreground mb-3">{app.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {app.allowed_scopes?.map(scope => (
                            <Badge key={scope} variant="outline">{scope}</Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Registered {format(new Date(app.created_at), 'MMM d, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}

                  {applications?.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No external applications registered yet</p>
                        <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Register First Application
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Conference Hub Fee Notifications */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Conference Hub — Fee Payment Notifications
                  </CardTitle>
                  <CardDescription>
                    When enabled, the HESS Member Portal will send a notification to Conference Hub each time an invoice is marked as paid, including the organization name and payment status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Enable Fee Payment Notifications</p>
                      <p className="text-xs text-muted-foreground">Send payment status updates to Conference Hub when invoices are marked as paid</p>
                    </div>
                    <Switch
                      checked={chFeeNotifications}
                      onCheckedChange={setChFeeNotifications}
                    />
                  </div>
                  <Button onClick={handleChSaveFeeNotifications} disabled={chSaving}>
                    {chSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Setting
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Access Logs
                  </CardTitle>
                  <CardDescription>
                    Audit trail of cross-application authentication requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Application</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Scopes</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs?.map(log => {
                        const app = applications?.find(a => a.id === log.app_id);
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">
                              {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                            </TableCell>
                            <TableCell>{app?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {log.scopes_requested?.map(scope => (
                                  <Badge key={scope} variant="secondary" className="text-xs">
                                    {scope.replace(':read', '')}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {log.ip_address}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!accessLogs || accessLogs.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No access logs yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integration">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Guide for External Lovable Projects</CardTitle>
                  <CardDescription>
                    Follow these steps to integrate your Lovable project with HESS Member Portal authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Step 1: Copy Supabase Configuration</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      In your external project, update the Supabase client to use these credentials:
                    </p>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tyovnvuluyosjnabrzjc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5b3ZudnVsdXlvc2puYWJyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE0MzIsImV4cCI6MjA3MTc5NzQzMn0.G3HlqGeyLS_39jxbrKtttcsE93A9WvFSEByJow--470";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Step 2: Create Auth Helper Hook</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Create this hook to fetch user context from HESS:
                    </p>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// src/hooks/useHessAuth.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const APP_IDENTIFIER = 'your-app-identifier'; // Replace with your registered identifier

export function useHessAuth() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUserContext = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('external-get-user-context', {
        body: { 
          app_identifier: APP_IDENTIFIER,
          scopes: ['profile:read', 'organization:read', 'roles:read', 'cohorts:read']
        }
      });
      
      if (error) throw error;
      if (data?.success) {
        setUser(data.user);
        setOrganization(data.organization);
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch user context:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await fetchUserContext();
        } else {
          setUser(null);
          setOrganization(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserContext();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    setRoles([]);
  };

  const redirectToProfile = () => {
    window.open('https://hessmemberportal.lovable.app/profile', '_blank');
  };

  return { 
    user, 
    organization, 
    roles, 
    loading, 
    isAdmin: roles.includes('admin'),
    signIn,
    signOut,
    redirectToProfile
  };
}`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Step 3: Use in Components</h3>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`// Example usage in a component
import { useHessAuth } from '@/hooks/useHessAuth';

function MyComponent() {
  const { user, organization, roles, loading, redirectToProfile } = useHessAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return (
    <div>
      <h1>Welcome, {user.first_name}!</h1>
      <p>Organization: {organization?.name}</p>
      <p>Roles: {roles.join(', ')}</p>
      <button onClick={redirectToProfile}>
        Edit Profile (opens HESS Portal)
      </button>
    </div>
  );
}`}
                    </pre>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Important Notes</h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 list-disc list-inside">
                      <li>All profile/organization updates must be done in HESS Member Portal</li>
                      <li>External apps have read-only access to user data</li>
                      <li>Users log in once and session works across all integrated apps</li>
                      <li>Data is always up-to-date since all apps read from the same database</li>
                    </ul>
                  </div>

                  <div className="border-t pt-6 mt-6">
                    <h3 className="font-semibold mb-2 text-lg">
                      Step 4: Conference Hub Webhook Integration (optional)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Apps that issue or redeem conference registration codes (e.g. Conference Hub for{" "}
                      <code className="bg-muted px-1 rounded">hess2026</code>) exchange signed webhooks
                      with the portal. Two flows, one shared secret.
                    </p>

                    <h4 className="font-semibold mb-2">Outbound: portal → external app</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      When a member's invoice is marked paid, the portal calls{" "}
                      <code className="bg-muted px-1 rounded">issue-conference-registration-code</code>{" "}
                      which POSTs to your app's registered <code className="bg-muted px-1 rounded">app_url</code>.
                      <strong className="block mt-1">
                        Register the Supabase functions base URL, not a friendly hostname.
                      </strong>
                      Example for a Hub project with ref <code className="bg-muted px-1 rounded">nzpjiesxqtecpxmnoqud</code>:
                    </p>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto mb-2">
{`app_identifier:  conference-hub
app_url:         https://nzpjiesxqtecpxmnoqud.supabase.co
is_active:       true

# Portal appends /functions/v1/receive-registration-code at call time.`}
                    </pre>
                    <p className="text-sm text-muted-foreground mb-2">Headers the portal sends:</p>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto mb-2">
{`Content-Type:      application/json
X-Source:          hess-member-portal
X-Event:           registration_code_issued
X-Webhook-Secret:  <MEDIUS_EVENTS_WEBHOOK_SECRET>`}
                    </pre>
                    <p className="text-sm text-muted-foreground mb-2">Body:</p>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto mb-4">
{`{
  "source":   "hess-member-portal",
  "event":    "registration_code_issued",
  "timestamp": "2026-06-25T19:12:18Z",
  "data": {
    "conference_slug":    "hess2026",
    "organization_id":    "uuid",
    "organization_name":  "Acme University",
    "registration_code":  "HESS2026-ABCD1234",
    "issued_at":          "2026-06-25T19:12:18Z",
    "max_attendees":      1
  }
}`}
                    </pre>

                    <h4 className="font-semibold mb-2">Inbound: external app → portal (redemption)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      When an attendee redeems a code, POST back to:
                    </p>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto mb-2">
{`POST https://tyovnvuluyosjnabrzjc.supabase.co/functions/v1/receive-registration-redemption

Headers:
  Content-Type:      application/json
  X-Webhook-Secret:  <shared secret>

Body:
  {
    "registration_code":  "HESS2026-ABCD1234",
    "attendee_email":     "person@school.edu",
    "attendee_name":      "Jane Doe",
    "attendee_title":     "Director of IT",      // optional
    "redeemed_at":        "2026-06-25T20:00:00Z", // optional, ISO8601
    "conference_registration_id": "hub-internal-id" // optional
  }`}
                    </pre>
                    <p className="text-sm text-muted-foreground mb-4">
                      Responses: <code className="bg-muted px-1 rounded">200</code> on success or idempotent
                      replay, <code className="bg-muted px-1 rounded">404</code> if the code is unknown,{" "}
                      <code className="bg-muted px-1 rounded">409</code> if already redeemed by a different
                      attendee, <code className="bg-muted px-1 rounded">401</code> on bad secret.
                    </p>

                    <h4 className="font-semibold mb-2">Shared secret</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
                      <li>
                        Portal stores it as <code className="bg-muted px-1 rounded">MEDIUS_EVENTS_WEBHOOK_SECRET</code>.
                      </li>
                      <li>
                        Conference Hub stores the same value as{" "}
                        <code className="bg-muted px-1 rounded">HESS_PORTAL_WEBHOOK_SECRET</code>{" "}
                        (legacy alias <code className="bg-muted px-1 rounded">HESS_MEMBER_PORTAL_WEBHOOK_SECRET</code> also accepted).
                      </li>
                      <li>
                        The exact same string must live in both vaults. A mismatch produces{" "}
                        <code className="bg-muted px-1 rounded">401 unauthorized</code> on both directions.
                      </li>
                      <li>
                        The same secret authenticates Medius Events → portal payment webhooks
                        (<code className="bg-muted px-1 rounded">receive-membership-payment</code>),
                        so rotating it requires updating both apps simultaneously.
                      </li>
                    </ul>

                    <h4 className="font-semibold mb-2">Feature flags</h4>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
                      <li>
                        <code className="bg-muted px-1 rounded">conference_hub_registration_codes_enabled</code>{" "}
                        must be <code className="bg-muted px-1 rounded">true</code> for the portal to issue
                        codes on paid invoices.
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">conference_hub_fee_notifications</code>{" "}
                        controls outbound fee-payment notifications and is independent of the
                        registration-code flow.
                      </li>
                    </ul>

                    <h4 className="font-semibold mb-2">End-to-end smoke test</h4>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>
                        Enable <code className="bg-muted px-1 rounded">conference_hub_registration_codes_enabled</code>.
                      </li>
                      <li>
                        Call <code className="bg-muted px-1 rounded">issue-conference-registration-code</code>{" "}
                        with a real <code className="bg-muted px-1 rounded">organization_id</code> and{" "}
                        <code className="bg-muted px-1 rounded">conference_slug: "hess2026"</code>.
                      </li>
                      <li>
                        Verify a row appears in{" "}
                        <code className="bg-muted px-1 rounded">conference_registration_codes</code> with{" "}
                        <code className="bg-muted px-1 rounded">sent_status='sent'</code>.
                      </li>
                      <li>Redeem the code in the Conference Hub.</li>
                      <li>
                        Confirm the redemption row updates with{" "}
                        <code className="bg-muted px-1 rounded">redeemed_at</code>,{" "}
                        <code className="bg-muted px-1 rounded">redeemed_attendee_email</code>, and{" "}
                        <code className="bg-muted px-1 rounded">sent_status='redeemed'</code>.
                      </li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="simplelists" className="space-y-4">
              {/* Connection & Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Simplelists Integration
                        {slConnectionStatus === 'connected' && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <Wifi className="h-3 w-3 mr-1" /> Connected
                          </Badge>
                        )}
                        {slConnectionStatus === 'error' && (
                          <Badge variant="destructive">
                            <WifiOff className="h-3 w-3 mr-1" /> Error
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Automatically sync member contacts with your Simplelists mailing list
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleSlTestConnection}
                      disabled={slTesting}
                    >
                      {slTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                      Test Connection
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sl-list-name">Primary List Name</Label>
                      <Input
                        id="sl-list-name"
                        value={slListName}
                        onChange={(e) => setSlListName(e.target.value)}
                        placeholder="hess_members@hessconsortium.simplelists.com"
                      />
                      <p className="text-xs text-muted-foreground">The main Simplelists list all contacts will be added to</p>
                    </div>
                    <div className="space-y-4 pt-6">
                      <div className="flex items-center space-x-2">
                        <Switch checked={slEnabled} onCheckedChange={setSlEnabled} />
                        <Label>Enable Auto-Sync</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={slSyncSecondary} onCheckedChange={setSlSyncSecondary} />
                        <Label>Sync Secondary Contacts</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSlSaveSettings} disabled={slSaving}>
                      {slSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Save Settings
                    </Button>
                    <Button variant="outline" onClick={handleSlSyncAll} disabled={slSyncing}>
                      {slSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                      Sync All Current Members
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Cohort-to-List Mapping */}
              <SimplelistsCohortMappings />

              {/* Sync Activity Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Sync Activity Log
                  </CardTitle>
                  <CardDescription>Recent Simplelists sync operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs?.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.email}</TableCell>
                          <TableCell className="text-sm">{log.organization_name || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                              {log.status}
                            </Badge>
                            {log.error_message && (
                              <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!syncLogs || syncLogs.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No sync activity yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* How It Works */}
              <Card>
                <CardHeader>
                  <CardTitle>How Auto-Sync Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">1</Badge>
                      <p><strong>Member Approval:</strong> When a new registration is approved, the primary (and optionally secondary) contact is automatically added to your primary Simplelists list.</p>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">2</Badge>
                      <p><strong>Cohort Lists:</strong> If the registration includes system fields that match your cohort-to-list mappings below, contacts are also added to those cohort-specific lists.</p>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">3</Badge>
                      <p><strong>Organization Deletion:</strong> When an organization/member is removed, their contacts are automatically removed from Simplelists.</p>
                    </div>
                    <div className="flex gap-3">
                      <Badge variant="outline" className="shrink-0">4</Badge>
                      <p><strong>Contact Transfer:</strong> When a primary contact transfer is approved, the old contact is removed and the new contact is added to Simplelists.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Edit Dialog */}
          <Dialog open={!!editingApp} onOpenChange={(open) => !open && setEditingApp(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Application</DialogTitle>
                <DialogDescription>
                  Update the settings for {editingApp?.name}
                </DialogDescription>
              </DialogHeader>
              {editingApp && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Application Name</Label>
                      <Input
                        id="edit-name"
                        value={editingApp.name}
                        onChange={(e) => setEditingApp(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Identifier (read-only)</Label>
                      <Input value={editingApp.app_identifier} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-url">Application URL</Label>
                    <Input
                      id="edit-url"
                      value={editingApp.app_url}
                      onChange={(e) => setEditingApp(prev => prev ? ({ ...prev, app_url: e.target.value }) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editingApp.description || ''}
                      onChange={(e) => setEditingApp(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingApp.is_active}
                      onCheckedChange={(checked) => setEditingApp(prev => prev ? ({ ...prev, is_active: checked }) : null)}
                    />
                    <Label>Application Active</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Allowed Scopes</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_SCOPES.map(scope => (
                        <div key={scope.id} className="flex items-center space-x-2 p-2 border rounded">
                          <Switch
                            checked={editingApp.allowed_scopes?.includes(scope.id)}
                            onCheckedChange={() => toggleScope(scope.id, false)}
                          />
                          <div>
                            <p className="text-sm font-medium">{scope.label}</p>
                            <p className="text-xs text-muted-foreground">{scope.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingApp(null)}>Cancel</Button>
                <Button onClick={() => editingApp && updateAppMutation.mutate(editingApp)}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
  );
}

export default function ExternalApplications() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-4 pt-0">
          <ExternalApplicationsContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
