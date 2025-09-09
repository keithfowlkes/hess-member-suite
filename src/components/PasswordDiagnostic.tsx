import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function PasswordDiagnostic() {
  const [isChecking, setIsChecking] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const { toast } = useToast();

  const runDiagnostic = async () => {
    setIsChecking(true);
    try {
      // Test 1: Check if user exists
      console.log('🔍 Running password diagnostic...');
      
      // Test 2: Try to call the change password function
      const { data, error } = await supabase.functions.invoke('change-user-password', {
        body: { 
          userEmail: 'fowlkes@thecoalition.us',
          newPassword: 'Tale2tell!!'
        }
      });

      const result = {
        timestamp: new Date().toISOString(),
        functionCall: {
          data,
          error: error ? {
            message: error.message,
            details: error
          } : null
        }
      };

      setDiagnosticResult(result);
      console.log('Diagnostic result:', result);

      if (error) {
        toast({
          title: "Diagnostic Found Issues",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password Should Be Fixed",
          description: "Try logging in now with 'Tale2tell!!'"
        });
      }
    } catch (error: any) {
      const result = {
        timestamp: new Date().toISOString(),
        error: error.message,
        fullError: error
      };
      setDiagnosticResult(result);
      console.error('Diagnostic error:', error);
      toast({
        title: "Diagnostic Failed", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Password Diagnostic Tool</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Diagnose and fix password issues for fowlkes@thecoalition.us
      </p>
      <Button 
        onClick={runDiagnostic} 
        disabled={isChecking}
        className="mb-4"
      >
        {isChecking ? 'Running Diagnostic...' : 'Run Password Diagnostic'}
      </Button>
      
      {diagnosticResult && (
        <div className="mt-4 p-3 bg-white rounded border">
          <h4 className="font-semibold mb-2">Diagnostic Results:</h4>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(diagnosticResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}