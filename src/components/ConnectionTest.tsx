import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export function ConnectionTest() {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [message, setMessage] = useState('Testing connection...');

  const testConnection = async () => {
    setStatus('testing');
    setMessage('Testing Supabase connection...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new Error(`Session error: ${error.message}`);
      }
      
      setStatus('success');
      setMessage(`Connection successful! Session: ${data.session ? 'authenticated' : 'not authenticated'}`);
    } catch (err: any) {
      setStatus('error');
      setMessage(`Connection failed: ${err.message}`);
      console.error('Connection test error:', err);
    }
  };

  const clearAllData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      setMessage('All local data cleared. Please refresh the page.');
    } catch (err) {
      console.error('Error clearing data:', err);
      setMessage('Error clearing data');
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === 'testing' && <RefreshCw className="h-4 w-4 animate-spin" />}
          {status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
          {status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`text-sm ${
          status === 'success' ? 'text-green-600' : 
          status === 'error' ? 'text-red-600' : 
          'text-muted-foreground'
        }`}>
          {message}
        </p>
        
        <div className="flex gap-2">
          <Button 
            onClick={testConnection}
            disabled={status === 'testing'}
            variant="outline"
            size="sm"
          >
            Test Again
          </Button>
          
          <Button 
            onClick={clearAllData}
            variant="destructive" 
            size="sm"
          >
            Clear All Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}