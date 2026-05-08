import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Inbox } from 'lucide-react';
import { ExternalApplicationsContent } from '@/pages/ExternalApplications';
import { InboundPaymentsContent } from '@/pages/InboundPayments';

export function IntegrationsManagement() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="external" className="space-y-4">
        <TabsList>
          <TabsTrigger value="external">
            <Share2 className="h-4 w-4 mr-2" />
            External Applications
          </TabsTrigger>
          <TabsTrigger value="inbound">
            <Inbox className="h-4 w-4 mr-2" />
            Inbound Payments
          </TabsTrigger>
        </TabsList>
        <TabsContent value="external">
          <ExternalApplicationsContent />
        </TabsContent>
        <TabsContent value="inbound">
          <InboundPaymentsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
