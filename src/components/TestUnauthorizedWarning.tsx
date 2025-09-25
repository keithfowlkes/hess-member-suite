import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const TestUnauthorizedWarning = () => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendTestNotification = async () => {
    setIsSending(true);
    
    try {
      console.log('🧪 Triggering test unauthorized warning notification...');
      
      const { data, error } = await supabase.functions.invoke('test-unauthorized-warning', {
        body: {}
      });
      
      console.log('Test function response:', { data, error });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Test Email Sent",
        description: "Unauthorized update warning notification sent to keith@hessconsortium.org",
      });
      
    } catch (error: any) {
      console.error('Test notification error:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test notification",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-background">
      <h3 className="text-lg font-semibold mb-2">Test Unauthorized Warning</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Send a test unauthorized update warning for Fowlkes University to keith@hessconsortium.org
      </p>
      <Button 
        onClick={sendTestNotification}
        disabled={isSending}
        variant="outline"
      >
        {isSending ? "Sending..." : "Send Test Notification"}
      </Button>
    </div>
  );
};