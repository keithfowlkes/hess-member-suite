import { Layout } from '@/components/Layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, FileText, DollarSign, LogOut, MapPin, Mail, User, AlertTriangle, Edit3 } from 'lucide-react';
import { useUnifiedProfile } from '@/hooks/useUnifiedProfile';
import { useOrganizationTotals } from '@/hooks/useOrganizationTotals';
import { useInvoices } from '@/hooks/useInvoices';
import MemberSystemMessages from '@/components/MemberSystemMessages';
import { ProfileEditModal } from '@/components/ProfileEditModal';

import { useState, useEffect } from 'react';

const Index = () => {
  const { isViewingAsAdmin, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [userOrganization, setUserOrganization] = useState<any>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { getUserOrganization } = useUnifiedProfile();
  const { data: totals, isLoading: totalsLoading } = useOrganizationTotals();
  const { invoices, loading: invoicesLoading } = useInvoices();

  // Fetch user's organization data
  useEffect(() => {
    // Scroll to top when landing page loads
    window.scrollTo(0, 0);
    
    const fetchUserOrganization = async () => {
      if (user?.id) {
        const org = await getUserOrganization(user.id);
        console.log('Fetched user organization:', org);
        setUserOrganization(org);
      }
    };
    fetchUserOrganization();
  }, [user, getUserOrganization]);

  // Redirect admin users to the Master Dashboard
  if (isViewingAsAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Calculate outstanding balance from invoices
  const outstandingBalance = invoices
    .filter(invoice => invoice.status !== 'paid')
    .reduce((total, invoice) => total + (invoice.prorated_amount || invoice.amount), 0);

  const hasOutstandingBalance = outstandingBalance > 0;

  // Define member stats for first row
  const firstRowStats = [
    { title: 'Membership Status', value: 'Active', icon: Building2, color: 'text-green-600', isClickable: false, hasAlert: false, onClick: undefined },
    { title: 'Next Renewal', value: 'Dec 2024', icon: FileText, color: 'text-blue-600', isClickable: false, hasAlert: false, onClick: undefined },
  ];

  // Define member stats for second row  
  const secondRowStats = [
    {
      title: 'Annual Member Fee',
      value: userOrganization?.annual_fee_amount ? `$${userOrganization.annual_fee_amount.toFixed(2)}` : '$0.00',
      icon: DollarSign,
      color: 'text-blue-600',
      isClickable: false,
      hasAlert: false,
      onClick: undefined
    },
    { 
      title: 'Outstanding Balance', 
      value: `$${outstandingBalance.toFixed(2)}`, 
      icon: DollarSign, 
      color: hasOutstandingBalance ? 'text-red-600' : 'text-green-600',
      isClickable: true,
      hasAlert: hasOutstandingBalance,
      onClick: () => navigate('/invoices')
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Member Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  View your membership status and invoices
                </p>
                {user?.email && (
                  <div className="text-sm text-muted-foreground mt-1">
                    <span>Logged in as: </span>
                    <a 
                      href={`mailto:${user.email}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {user.email}
                    </a>
                    {userOrganization?.name && (
                      <span className="ml-2 text-foreground">
                        • <span className="font-medium">{userOrganization.name}</span>
                      </span>
                    )}
                  </div>
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

            <MemberSystemMessages />

            {/* Institution Information - Moved to top */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Institution Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Organization Information */}
                  <div className="flex-1">
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

                        {userOrganization.updated_at && (
                          <div className="pt-2 border-t">
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Last Updated:</span> {new Date(userOrganization.updated_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Loading institution information...</div>
                    )}
                  </div>

                  {/* Profile Update Button */}
                  <div className="flex-shrink-0 lg:w-64">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 h-full flex flex-col justify-center">
                      <div className="text-center space-y-3">
                        <Edit3 className="h-8 w-8 text-primary mx-auto" />
                        <div>
                          <h4 className="font-medium text-foreground mb-1">Keep Your Profile Current</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Update your organization and contact information
                          </p>
                        </div>
                        <Button 
                          onClick={() => setProfileModalOpen(true)}
                          className="w-full"
                          size="lg"
                        >
                          Update Your Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="space-y-6">
              {/* First Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {firstRowStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card 
                      key={stat.title}
                      className={stat.isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                      onClick={stat.onClick}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {stat.title}
                          {stat.hasAlert && (
                            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Alert
                            </Badge>
                          )}
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
              
              {/* Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secondRowStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card 
                      key={stat.title}
                      className={stat.isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                      onClick={stat.onClick}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {stat.title}
                          {stat.hasAlert && (
                            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Alert
                            </Badge>
                          )}
                        </CardTitle>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                          {invoicesLoading && stat.title === 'Outstanding Balance' ? '...' : stat.value}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
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

            {/* Recent Activity */}
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
            </div>
          
          {/* Profile Edit Modal */}
          <ProfileEditModal 
            open={profileModalOpen} 
            onOpenChange={setProfileModalOpen} 
          />
          
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;