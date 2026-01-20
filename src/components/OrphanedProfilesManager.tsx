import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, Wrench, AlertTriangle, CheckCircle, Users, Mail, Zap } from 'lucide-react';

interface OrphanedProfile {
  profileId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  organizationId: string | null;
  organizationName: string | null;
  issue: 'no_auth_user' | 'email_mismatch';
  authEmail?: string;
}

interface DetectionResult {
  success: boolean;
  totalChecked: number;
  orphanedCount: number;
  orphanedProfiles: OrphanedProfile[];
}

interface FixResult {
  profileId: string;
  email: string;
  success: boolean;
  action?: string;
  error?: string;
  note?: string;
}

export function OrphanedProfilesManager() {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFixAllDialog, setShowFixAllDialog] = useState(false);
  const [fixResults, setFixResults] = useState<FixResult[] | null>(null);
  const { toast } = useToast();

  const detectOrphanedProfiles = async () => {
    setLoading(true);
    setResult(null);
    setSelectedProfiles(new Set());
    setFixResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('detect-orphaned-profiles', {
        body: { action: 'detect' }
      });

      if (error) throw error;

      setResult(data);
      
      if (data.orphanedCount === 0) {
        toast({
          title: "No Issues Found",
          description: `Checked ${data.totalChecked} profiles. All profiles have valid auth users.`,
        });
      } else {
        toast({
          title: "Orphaned Profiles Detected",
          description: `Found ${data.orphanedCount} profiles with issues out of ${data.totalChecked} checked.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Detection error:', error);
      toast({
        title: "Detection Failed",
        description: error instanceof Error ? error.message : "Failed to detect orphaned profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && result) {
      setSelectedProfiles(new Set(result.orphanedProfiles.map(p => p.profileId)));
    } else {
      setSelectedProfiles(new Set());
    }
  };

  const handleSelectProfile = (profileId: string, checked: boolean) => {
    const newSelected = new Set(selectedProfiles);
    if (checked) {
      newSelected.add(profileId);
    } else {
      newSelected.delete(profileId);
    }
    setSelectedProfiles(newSelected);
  };

  const fixProfiles = async (profileIds: string[]) => {
    if (profileIds.length === 0) return;
    
    setFixing(true);
    setShowConfirmDialog(false);
    setShowFixAllDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('detect-orphaned-profiles', {
        body: { 
          action: 'fix',
          profileIds
        }
      });

      if (error) throw error;

      setFixResults(data.results);

      const successCount = data.results.filter((r: FixResult) => r.success).length;
      const failCount = data.results.filter((r: FixResult) => !r.success).length;

      if (failCount === 0) {
        toast({
          title: "All Profiles Fixed",
          description: `Successfully fixed ${successCount} profile(s). Users should use "Forgot Password" to set their credentials.`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Fixed ${successCount} profile(s), ${failCount} failed.`,
          variant: "destructive",
        });
      }

      // Re-run detection to update the list
      await detectOrphanedProfiles();
    } catch (error) {
      console.error('Fix error:', error);
      toast({
        title: "Fix Failed",
        description: error instanceof Error ? error.message : "Failed to fix profiles",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  const fixSelectedProfiles = () => fixProfiles(Array.from(selectedProfiles));
  
  const fixAllProfiles = () => {
    if (result) {
      fixProfiles(result.orphanedProfiles.map(p => p.profileId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Orphaned Profile Detection & Repair
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Detect profiles that have no corresponding auth user (cannot log in) and fix them by creating the missing auth user.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={detectOrphanedProfiles} disabled={loading || fixing}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Detect Orphaned Profiles
              </>
            )}
          </Button>

          {result && result.orphanedCount > 0 && (
            <>
              <Button 
                variant="default" 
                onClick={() => setShowFixAllDialog(true)}
                disabled={fixing}
                className="bg-green-600 hover:bg-green-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Fix All ({result.orphanedCount})
              </Button>

              {selectedProfiles.size > 0 && selectedProfiles.size < result.orphanedCount && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={fixing}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Fix Selected ({selectedProfiles.size})
                </Button>
              )}
            </>
          )}
        </div>

        {result && result.orphanedCount > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="destructive" className="text-sm">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {result.orphanedCount} Issues Found
              </Badge>
              <span className="text-sm text-muted-foreground">
                Checked {result.totalChecked} profiles
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProfiles.size === result.orphanedProfiles.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.orphanedProfiles.map((profile) => (
                    <TableRow key={profile.profileId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProfiles.has(profile.profileId)}
                          onCheckedChange={(checked) => 
                            handleSelectProfile(profile.profileId, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {profile.firstName} {profile.lastName}
                      </TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>
                        {profile.organizationName || profile.organization || '-'}
                      </TableCell>
                      <TableCell>
                        {profile.issue === 'no_auth_user' ? (
                          <Badge variant="destructive" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            No Auth User
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Mail className="h-3 w-3 mr-1" />
                            Email Mismatch: {profile.authEmail}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {result && result.orphanedCount === 0 && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span>All {result.totalChecked} profiles have valid auth users.</span>
          </div>
        )}

        {fixResults && fixResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Fix Results:</h4>
            <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
              {fixResults.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {r.success ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                  <span className="truncate">{r.email}: {r.success ? r.action : r.error}</span>
                  {r.note && <span className="text-muted-foreground text-xs">({r.note})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <h4 className="font-medium text-blue-800 mb-2">What this tool does:</h4>
          <ul className="list-disc list-inside text-blue-700 space-y-1">
            <li><strong>No Auth User:</strong> Creates a new auth user for the profile and assigns the member role. User must use "Forgot Password" to set their password.</li>
            <li><strong>Email Mismatch:</strong> Updates the auth user's email to match the profile email.</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <h4 className="font-medium text-blue-800 mb-1">Root Cause:</h4>
            <p className="text-blue-700">
              Orphaned profiles typically occur from legacy data imports or manual database entries before the current registration approval system was implemented. 
              The current approval processes correctly create auth users for all new registrations.
            </p>
          </div>
        </div>

        {/* Fix Selected Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fix {selectedProfiles.size} Orphaned Profile(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create missing auth users and/or sync email addresses. Users with newly created auth accounts will need to use "Forgot Password" to set their credentials.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={fixSelectedProfiles}>
                Fix Profiles
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Fix All Dialog */}
        <AlertDialog open={showFixAllDialog} onOpenChange={setShowFixAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fix ALL {result?.orphanedCount || 0} Orphaned Profiles?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create missing auth users for all detected orphaned profiles. Each user will need to use "Forgot Password" on the login page to set their credentials before they can log in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={fixAllProfiles} className="bg-green-600 hover:bg-green-700">
                Fix All Profiles
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
