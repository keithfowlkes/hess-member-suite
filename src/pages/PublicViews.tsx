import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { PublicOrganizationDirectory } from '@/components/PublicOrganizationDirectory';
import { PublicPageManager } from '@/components/PublicPageManager';
import { USMap } from '@/components/USMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Map } from 'lucide-react';

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
                Manage and configure public-facing content and directories for HESS Consortium
              </p>
            </div>
            
            <Tabs defaultValue="directory" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="directory" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organization Directory
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  U.S. Map
                </TabsTrigger>
              </TabsList>

              <TabsContent value="directory" className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Organization Directory</h2>
                  <PublicOrganizationDirectory />
                </div>
              </TabsContent>

              <TabsContent value="map" className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Member Location Map</h2>
                  <p className="text-muted-foreground mb-6">
                    Interactive map showing the geographic distribution of HESS member organizations across the United States
                  </p>
                  <USMap />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-8">
              <div>
                <PublicPageManager />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}