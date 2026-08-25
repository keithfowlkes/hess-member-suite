import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ArcticSecurityDashboard } from '@/components/ArcticSecurityDashboard';
import arcticLogo from '@/assets/arctic-logo.png';
import deepseasLogo from '@/assets/deepseas-logo.png.asset.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck } from 'lucide-react';

const AdminMemberSecurity = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          {/* Mobile menu button */}
          <div className="sticky top-0 z-50 flex items-center gap-2 -mx-8 -mt-8 mb-6 border-b bg-background p-4 lg:hidden">
            <SidebarTrigger className="h-10 w-10 rounded-md border-2 border-primary bg-primary/10 hover:bg-primary/20" />
            <h1 className="text-lg font-semibold">HESS Consortium</h1>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Member Security</h1>
                <p className="text-muted-foreground mt-2">
                  Security assessment and threat intelligence services across HESS Consortium member institutions
                </p>
                <p className="text-sm text-muted-foreground/80 mt-1 italic whitespace-pre-line">
                  THIS INFORMATION IS PRIVATE AND CONFIDENTIAL FOR YOUR INSTITUTION ONLY.{"\n"}
                  IF YOU WORK FOR AN OUTSOURCED IT SERVICE PROVIDER, YOU ARE PROHIBITED FROM SHARING THIS INFORMATION OUTSIDE OF THE INSTITUTION.
                </p>
              </div>
            </div>

            <Tabs defaultValue="security" className="w-full">
              <TabsList className="grid w-full mb-6 grid-cols-2">
                <TabsTrigger value="security" className="gap-2">
                  <img src={arcticLogo} alt="Arctic" className="h-4 w-4" />
                  Arctic Security Scan
                </TabsTrigger>
                <TabsTrigger value="deepseas" className="gap-2">
                  <img src={deepseasLogo.url} alt="DeepSeas" className="h-4 w-auto" />
                  Dark Web Service
                </TabsTrigger>
              </TabsList>

              <TabsContent value="security">
                <ArcticSecurityDashboard />
              </TabsContent>

              <TabsContent value="deepseas">
                <Card className="bg-gradient-to-r from-background via-background/95 to-background border-2 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <img src={deepseasLogo.url} alt="DeepSeas" className="h-12 w-auto" />
                      <div>
                        <CardTitle className="text-xl">DeepSeas Dark Web Service</CardTitle>
                        <p className="text-muted-foreground mt-1">
                          Dark web monitoring and threat intelligence for subscribing HESS Consortium member institutions.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      DeepSeas Dark Web Service integration coming soon.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      If you have not subscribed to this service, you will not see any data for your institution. For more information, <a href="mailto:sales@deepseas.com?subject=HESS%20Consortium%20Member%20Interest" className="text-primary hover:underline">click here</a> to email DeepSeas for HESS discount pricing for this service.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center justify-center py-8 mt-12 border-t border-border">
            <img src="/lovable-uploads/95b9e225-2202-4407-bdb2-f95edf683d93.png" alt="DeusLogic Logo" className="h-8 w-auto mb-2 opacity-70" />
            <p className="text-xs text-muted-foreground">Copyright 2025 DeusLogic, LLC.</p>
            <p className="text-xs text-muted-foreground text-center mt-4 max-w-2xl px-4">
              The member information on this website portal is confidential to HESS Consortium members. This information should not be shared with outside organizations without the written permission of the members.
            </p>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminMemberSecurity;
