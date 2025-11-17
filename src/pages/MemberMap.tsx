import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { PublicUSMap } from '@/components/PublicUSMap';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function MemberMap() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const handleCardClick = () => {
    console.log('Map card clicked! Current state:', isMapModalOpen);
    setIsMapModalOpen(true);
    console.log('State should now be true');
  };

  return (
    <>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 overflow-hidden">
            {/* Mobile menu button - always visible on mobile */}
            <div className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background p-4 lg:hidden">
              <SidebarTrigger className="h-10 w-10 rounded-md border-2 border-primary bg-primary/10 hover:bg-primary/20" />
              <h1 className="text-lg font-semibold">HESS Consortium</h1>
            </div>
            
            <div className="container mx-auto px-4 py-8 h-full">
              <div 
                onClick={handleCardClick}
                className="mb-8 cursor-pointer"
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Member Organization Map</CardTitle>
                    <CardDescription>
                      Interactive map showing the geographic distribution of our member organizations (click to enlarge)
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            
            <PublicUSMap />
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
            <p className="text-xs text-muted-foreground text-center mt-4 max-w-2xl px-4">
              The member information on this website portal is confidential to HESS Consortium members. This information should not be shared with outside organizations without the written permission of the members.
            </p>
          </div>
        </main>
      </div>
    </SidebarProvider>

    {/* Map Modal */}
    <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-6">
        <div className="w-full h-full overflow-auto">
          <PublicUSMap />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}