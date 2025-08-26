import { Layout } from '@/components/Layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, FileText, DollarSign, LogOut } from 'lucide-react';

const Index = () => {
  const { isAdmin, signOut } = useAuth();

  const adminStats = [
    { title: 'Total Members', value: '127', icon: Users, color: 'text-blue-600' },
    { title: 'Active Memberships', value: '98', icon: Building2, color: 'text-green-600' },
    { title: 'Pending Invoices', value: '23', icon: FileText, color: 'text-orange-600' },
    { title: 'Revenue YTD', value: '$127,000', icon: DollarSign, color: 'text-green-600' },
  ];

  const memberStats = [
    { title: 'Membership Status', value: 'Active', icon: Building2, color: 'text-green-600' },
    { title: 'Next Renewal', value: 'Dec 2024', icon: FileText, color: 'text-blue-600' },
    { title: 'Outstanding Balance', value: '$0', icon: DollarSign, color: 'text-green-600' },
  ];

  const stats = isAdmin ? adminStats : memberStats;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isAdmin ? 'Admin Dashboard' : 'Member Dashboard'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isAdmin 
                    ? 'Manage member organizations and billing' 
                    : 'View your membership status and invoices'}
                </p>
              </div>
              {!isAdmin && (
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => {
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
                      <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recent Activity */}
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
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
