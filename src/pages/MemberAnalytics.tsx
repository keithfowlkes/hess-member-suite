import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SystemAnalyticsDashboard } from '@/components/SystemAnalyticsDashboard';
import { OrganizationSizeCorrelation } from '@/components/OrganizationSizeCorrelation';
import { OrganizationSizeLMSCorrelation } from '@/components/OrganizationSizeLMSCorrelation';
import { AnalyticsFeedbackDialog } from '@/components/AnalyticsFeedbackDialog';
import { BarChart3, ChartScatter, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MemberAnalytics = () => {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          {/* Mobile menu button - always visible on mobile */}
          <div className="sticky top-0 z-50 flex items-center gap-2 -mx-8 -mt-8 mb-6 border-b bg-background p-4 lg:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">HESS Consortium</h1>
          </div>
          
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
                <p className="text-sm text-muted-foreground/80 mt-1 italic">
                  This is confidential member-only data and will not be shared to vendor partners.
                </p>
              </div>
            </div>
            
            <Card className="bg-gradient-to-r from-background via-background/95 to-background border-2 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ChartScatter className="h-6 w-6 text-primary" />
                      </div>
                      Trend Analytics
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">
                      Explore correlations and trends in member data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFeedbackDialogOpen(true)}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    What would you like to see?
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="org-size-correlation">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ChartScatter className="h-5 w-5 text-primary" />
                        <span>Organization Size vs System Choice</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <OrganizationSizeCorrelation />
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="org-size-lms-correlation">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ChartScatter className="h-5 w-5 text-primary" />
                        <span>Organization Size vs LMS Choice</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <OrganizationSizeLMSCorrelation />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
            
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
      
      <AnalyticsFeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
      />
    </SidebarProvider>
  );
};

export default MemberAnalytics;