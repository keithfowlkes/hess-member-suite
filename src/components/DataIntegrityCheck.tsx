import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IntegrityResult {
  publicViewCount: number;
  adminMemberCount: number;
  missingFromAdmin: string[];
  missingFromPublic: string[];
}

export const DataIntegrityCheck = () => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<IntegrityResult | null>(null);

  const runIntegrityCheck = async () => {
    setChecking(true);
    try {
      // Get public directory view records
      const { data: publicData, error: publicError } = await supabase
        .from('public_organization_directory')
        .select('id, name')
        .eq('membership_status', 'active');

      if (publicError) throw publicError;

      // Get organizations table records (same filter as useMembers)
      const { data: adminData, error: adminError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('membership_status', 'active');

      if (adminError) throw adminError;

      const publicIds = new Set(publicData?.map(o => o.id) || []);
      const adminIds = new Set(adminData?.map(o => o.id) || []);

      const missingFromAdmin = (publicData || [])
        .filter(o => !adminIds.has(o.id))
        .map(o => o.name || 'Unknown');

      const missingFromPublic = (adminData || [])
        .filter(o => !publicIds.has(o.id))
        .map(o => o.name || 'Unknown');

      setResult({
        publicViewCount: publicData?.length || 0,
        adminMemberCount: adminData?.length || 0,
        missingFromAdmin,
        missingFromPublic,
      });

      if (missingFromAdmin.length === 0 && missingFromPublic.length === 0) {
        toast.success('Data integrity check passed - no discrepancies found');
      } else {
        toast.warning(`Found ${missingFromAdmin.length + missingFromPublic.length} discrepancies`);
      }
    } catch (error) {
      console.error('Integrity check failed:', error);
      toast.error('Failed to run integrity check');
    } finally {
      setChecking(false);
    }
  };

  const hasDiscrepancies = result && (result.missingFromAdmin.length > 0 || result.missingFromPublic.length > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Data Integrity Check</CardTitle>
        <Button onClick={runIntegrityCheck} disabled={checking} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Run Check'}
        </Button>
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-sm text-muted-foreground">
            Click "Run Check" to compare the public directory view with the admin member list.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {hasDiscrepancies ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">
                  {hasDiscrepancies ? 'Discrepancies Found' : 'All Clear'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Public Directory View:</span>
                <Badge variant="outline" className="ml-2">{result.publicViewCount}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Admin Member List:</span>
                <Badge variant="outline" className="ml-2">{result.adminMemberCount}</Badge>
              </div>
            </div>

            {result.missingFromAdmin.length > 0 && (
              <div className="border-l-2 border-amber-500 pl-3">
                <p className="text-sm font-medium text-amber-600">In Public View but not in Admin ({result.missingFromAdmin.length}):</p>
                <ul className="text-sm text-muted-foreground mt-1">
                  {result.missingFromAdmin.slice(0, 10).map((name, i) => (
                    <li key={i}>• {name}</li>
                  ))}
                  {result.missingFromAdmin.length > 10 && (
                    <li className="italic">...and {result.missingFromAdmin.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            {result.missingFromPublic.length > 0 && (
              <div className="border-l-2 border-amber-500 pl-3">
                <p className="text-sm font-medium text-amber-600">In Admin but not in Public View ({result.missingFromPublic.length}):</p>
                <ul className="text-sm text-muted-foreground mt-1">
                  {result.missingFromPublic.slice(0, 10).map((name, i) => (
                    <li key={i}>• {name}</li>
                  ))}
                  {result.missingFromPublic.length > 10 && (
                    <li className="italic">...and {result.missingFromPublic.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
