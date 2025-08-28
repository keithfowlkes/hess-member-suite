import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MemberOrganizationsView } from '@/components/MemberOrganizationsView';
import { SystemAnalyticsDashboard } from '@/components/SystemAnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users } from 'lucide-react';

export default function ResearchDashboard() {
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
                Research Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore member organization data and system usage analytics
              </p>
            </div>
            
            <div className="space-y-8">
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Member Organizations Overview
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Browse and explore member organization profiles and statistics
                  </p>
                </div>
                <MemberOrganizationsView />
              </div>
              
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
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}