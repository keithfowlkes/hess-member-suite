import { useState } from 'react';
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
import { Plus, Edit, Trash2, ExternalLink, Shield, Activity, Copy, Check } from 'lucide-react';
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
];

export default function ExternalApplications() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ExternalApplication | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
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
      </SidebarInset>
    </SidebarProvider>
  );
}
