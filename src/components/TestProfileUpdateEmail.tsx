import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const TestProfileUpdateEmail = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const sendTestEmail = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Sending test profile update email...');
      
      const { data, error } = await supabase.functions.invoke('test-profile-update-email');
      
      if (error) {
        throw error;
      }
      
      console.log('Test email result:', data);
      setResult(data);
      
      if (data.success) {
        toast({
          title: 'Test Email Sent!',
          description: `Profile update confirmation email sent to ${data.organization}`,
        });
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
      
    } catch (error: any) {
      console.error('Error sending test email:', error);
      setResult({ success: false, error: error.message });
      toast({
        title: 'Error Sending Test Email',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Test Profile Update Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Send a test profile update confirmation email to HigherEdCommunities.org to verify the email system is working correctly.
        </p>
        
        <Button 
          onClick={sendTestEmail} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending Test Email...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Test Profile Update Email
            </>
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg border ${result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Success' : 'Error'}
              </span>
            </div>
            <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {result.message || result.error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};