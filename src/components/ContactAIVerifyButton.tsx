import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AIVerificationResult } from '@/components/AIVerificationResult';

interface Props {
  organizationName: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
}

export function ContactAIVerifyButton({ organizationName, firstName, lastName, title }: Props) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [structured, setStructured] = useState<any>(null);
  const [searchedFor, setSearchedFor] = useState<any>(null);

  if (!firstName && !lastName) return null;

  const verify = async () => {
    setIsVerifying(true);
    setResult(null);
    setStructured(null);
    setSearchedFor(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-contact-ai', {
        body: { organizationName, firstName, lastName, title: title || null },
      });
      if (error) {
        toast.error('Failed to verify contact: ' + error.message);
        return;
      }
      if (data?.success) {
        setResult(data.result);
        setStructured(data.structured || null);
        setSearchedFor(data.searchedFor || null);
        toast.success('Contact verification completed');
      } else {
        toast.error(data?.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Error during verification:', err);
      toast.error('An error occurred during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <Button type="button" variant="outline" size="sm" onClick={verify} disabled={isVerifying}>
        {isVerifying ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" />AI Verify Contact</>
        )}
      </Button>
      {result && <AIVerificationResult result={result} structured={structured} searchedFor={searchedFor} />}
    </div>
  );
}
