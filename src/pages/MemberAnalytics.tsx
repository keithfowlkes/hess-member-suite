import { Layout } from '@/components/Layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SystemAnalyticsDashboard } from '@/components/SystemAnalyticsDashboard';
import { BarChart3 } from 'lucide-react';

const MemberAnalytics = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Member Analytics
                </h1>
                <p className="text-muted-foreground mt-2">
                  System usage analytics across HESS Consortium member institutions
                </p>
              </div>
            </div>
            
            <SystemAnalyticsDashboard />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MemberAnalytics;