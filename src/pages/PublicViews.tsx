import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { PublicOrganizationDirectory } from '@/components/PublicOrganizationDirectory';

export default function PublicViews() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="container mx-auto space-y-8">
            <div className="border-b border-border pb-4">
              <h1 className="text-3xl font-bold text-foreground">Public Views</h1>
              <p className="text-muted-foreground mt-2">
                Manage and configure public-facing content and directories
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Organization Directory</h2>
                <PublicOrganizationDirectory />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}