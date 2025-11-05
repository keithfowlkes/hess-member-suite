import { Layout } from '@/components/Layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SystemAnalyticsDashboard } from '@/components/SystemAnalyticsDashboard';
import { OrganizationSizeCorrelation } from '@/components/OrganizationSizeCorrelation';
import { BarChart3 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="org-size-correlation">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  Organization Size vs System Choice
                </AccordionTrigger>
                <AccordionContent>
                  <OrganizationSizeCorrelation />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <SystemAnalyticsDashboard />
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
  );
};

export default MemberAnalytics;