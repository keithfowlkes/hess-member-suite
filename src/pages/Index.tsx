import { Layout } from '@/components/Layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigate } from 'react-router-dom';
import { Building2, FileText, DollarSign, LogOut, MapPin, Mail, User } from 'lucide-react';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';
import { useOrganizationTotals } from '@/hooks/useOrganizationTotals';
import { useState, useEffect } from 'react';

const Index = () => {
  const { isViewingAsAdmin, signOut, user } = useAuth();
  const [userOrganization, setUserOrganization] = useState<any>(null);
  const { getUserOrganization } = useUnifiedProfile();
  const { data: totals, isLoading: totalsLoading } = useOrganizationTotals();

  // Fetch user's organization data
  useEffect(() => {
    const fetchUserOrganization = async () => {
      if (user?.id) {
        const org = await getUserOrganization(user.id);
        setUserOrganization(org);
      }
    };
    fetchUserOrganization();
  }, [user, getUserOrganization]);

  // Redirect admin users to the Master Dashboard
  if (isViewingAsAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const memberStats = [
    { title: 'Membership Status', value: 'Active', icon: Building2, color: 'text-green-600' },
    { title: 'Next Renewal', value: 'Dec 2024', icon: FileText, color: 'text-blue-600' },
    { title: 'Outstanding Balance', value: '$0', icon: DollarSign, color: 'text-green-600' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Member Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  View your membership status and invoices
                </p>
                {user?.email && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Logged in as: 
                    <a 
                      href={`mailto:${user.email}`}
                      className="font-medium text-primary hover:underline ml-1"
                    >
                      {user.email}
                    </a>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {memberStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold flex items-center gap-2">
                        {stat.value}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Scroll hint text */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Please scroll down for more HESS institution information.</p>
            </div>

            {/* Member Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Member Organizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalsLoading ? '...' : totals?.totalOrganizations?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Student FTE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {totalsLoading ? '...' : totals?.totalStudentFte?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity and Member Institution Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Membership renewed</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Invoice generated</p>
                        <p className="text-xs text-muted-foreground">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Profile updated</p>
                        <p className="text-xs text-muted-foreground">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Member Institution Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Institution Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userOrganization ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{userOrganization.name}</h3>
                      </div>
                      
                      {(userOrganization.address_line_1 || userOrganization.city || userOrganization.state) && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="text-muted-foreground">
                            {userOrganization.address_line_1 && (
                              <div>{userOrganization.address_line_1}</div>
                            )}
                            {userOrganization.address_line_2 && (
                              <div>{userOrganization.address_line_2}</div>
                            )}
                            {(userOrganization.city || userOrganization.state) && (
                              <div>
                                {userOrganization.city}
                                {userOrganization.city && userOrganization.state && ', '}
                                {userOrganization.state} {userOrganization.zip_code}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {userOrganization.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${userOrganization.email}`}
                            className="text-primary hover:underline"
                          >
                            {userOrganization.email}
                          </a>
                        </div>
                      )}

                      {user?.email && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-foreground">Primary Contact</div>
                              <div className="text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Loading institution information...</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex flex-col items-center justify-center py-8 mt-12 border-t border-border">
            <img 
              src="/lovable-uploads/95b9e225-2202-4407-bdb2-f95edf683d93.png" 
              alt="DeusLogic Logo" 
              className="h-8 w-auto mb-2 opacity-70"
            />
            <p className="text-xs text-muted-foreground">
              Copyright 2025 DeusLogic, LLC.
            </p>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;