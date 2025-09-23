import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, GraduationCap, Building2, MapPin, Calendar, Mail } from 'lucide-react';

interface CohortMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization: string;
  city?: string;
  state?: string;
  primary_contact_title?: string;
  user_roles: {
    role: 'admin' | 'member' | 'cohort_leader';
  }[];
}

const CohortInformation = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [cohortMembers, setCohortMembers] = useState<CohortMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('member');

  useEffect(() => {
    const fetchCohortInformation = async () => {
      if (!user) return;

      try {
        // First, get the current user's role
        const { data: userRoleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError) {
          console.error('Error fetching user role:', roleError);
          return;
        }

        setUserRole(userRoleData?.role || 'member');

        // Check if user is admin or cohort leader
        if (userRoleData?.role === 'admin' || userRoleData?.role === 'cohort_leader') {
          // Fetch all users with their roles
          const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, organization, city, state, primary_contact_title, user_id');

          if (usersError) {
            console.error('Error fetching users:', usersError);
            toast({
              title: 'Error',
              description: 'Failed to load cohort information',
              variant: 'destructive'
            });
            return;
          }

          // Fetch user roles for cohort leaders
          const { data: rolesData, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .eq('role', 'cohort_leader');

          if (rolesError) {
            console.error('Error fetching roles:', rolesError);
            toast({
              title: 'Error',
              description: 'Failed to load cohort information',
              variant: 'destructive'
            });
            return;
          }

          // Combine users with their roles
          const cohortLeaders = usersData
            ?.filter(user => 
              rolesData?.some(role => role.user_id === user.user_id && role.role === 'cohort_leader')
            )
            .map(user => ({
              ...user,
              user_roles: rolesData
                ?.filter(role => role.user_id === user.user_id)
                .map(role => ({ role: role.role })) || []
            })) || [];
          
          setCohortMembers(cohortLeaders);
        }
      } catch (error) {
        console.error('Error in fetchCohortInformation:', error);
        toast({
          title: 'Error',
          description: 'Failed to load cohort information',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCohortInformation();
  }, [user, toast]);

  // Redirect if user doesn't have appropriate role
  if (!loading && userRole !== 'admin' && userRole !== 'cohort_leader') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to view cohort information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Cohort Information</h1>
              <p className="text-muted-foreground">
                View and manage cohort leader information across the HESS Consortium
              </p>
            </div>
            <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
              {userRole === 'admin' ? 'Admin' : 'Cohort Leader'}
            </Badge>
          </div>

          <Separator />

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded mb-1"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Cohort Leader Overview
                  </CardTitle>
                  <CardDescription>
                    Current cohort leaders in the HESS Consortium
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{cohortMembers.length}</div>
                      <div className="text-sm text-muted-foreground">Total Cohort Leaders</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {new Set(cohortMembers.map(m => m.state).filter(Boolean)).size}
                      </div>
                      <div className="text-sm text-muted-foreground">States Represented</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {new Set(cohortMembers.map(m => m.organization).filter(Boolean)).size}
                      </div>
                      <div className="text-sm text-muted-foreground">Organizations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Cohort Leaders Directory
                </h2>
                
                {cohortMembers.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">No cohort leaders found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cohortMembers.map((member) => (
                      <Card key={member.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium">
                                  {member.first_name} {member.last_name}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                  Cohort Leader
                                </Badge>
                              </div>
                            </div>
                            
                            {member.primary_contact_title && (
                              <p className="text-sm text-muted-foreground">
                                {member.primary_contact_title}
                              </p>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{member.organization || 'No organization'}</span>
                              </div>
                              
                              {(member.city || member.state) && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{member.city}{member.city && member.state && ', '}{member.state}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CohortInformation;