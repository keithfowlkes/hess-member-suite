import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MemberOrganizationsView } from '@/components/MemberOrganizationsView';
import { SystemAnalyticsDashboard } from '@/components/SystemAnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Building2 } from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';

export default function ResearchDashboard() {
  const { organizations, loading } = useMembers();

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="container mx-auto space-y-8">
            <div className="border-b border-border pb-4">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                HESS Member Information
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore member organization data and system usage analytics
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Total Member Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{organizations.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Student FTE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {organizations.reduce((total, org) => {
                      const fte = org.student_fte || 0;
                      return total + fte;
                    }, 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* System Usage Analytics */}
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  System Usage Analytics
                </h2>
                <p className="text-muted-foreground text-sm">
                  Distribution of software systems across active member institutions
                </p>
              </div>
              <SystemAnalyticsDashboard />
            </div>
            
            {/* Member Organizations */}
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Member Organizations
                </h2>
                <p className="text-muted-foreground text-sm">
                  Browse and explore member organization profiles
                </p>
              </div>
              <MemberOrganizationsView />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}