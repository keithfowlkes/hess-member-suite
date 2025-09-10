import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { PublicUSMap } from '@/components/PublicUSMap';

export default function MemberMap() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="container mx-auto px-4 py-8 h-full">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Member Organization Map
              </h1>
              <p className="text-muted-foreground">
                Interactive map showing the geographic distribution of our member organizations
              </p>
            </div>
            
            <PublicUSMap />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}