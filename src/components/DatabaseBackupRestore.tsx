import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  FileJson,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

export function DatabaseBackupRestore() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);
  const { toast } = useToast();

  const tables = [
    'organizations',
    'profiles',
    'user_roles',
    'pending_registrations',
    'member_registration_updates',
    'organization_profile_edit_requests',
    'organization_reassignment_requests',
    'communications',
    'custom_software_entries',
    'invoices',
    'system_field_options',
    'system_settings',
    'system_messages',
    'user_messages',
    'organization_invitations',
    'audit_log'
  ];

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      setBackupStatus(null);

      const { data, error } = await supabase.functions.invoke('backup-database', {
        body: { tables }
      });

      if (error) throw error;

      // Download the backup file
      const backupData = JSON.stringify(data.backup, null, 2);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hess-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus({
        success: true,
        message: 'Database backup completed successfully',
        timestamp: new Date().toISOString()
      });

      toast({
        title: 'Backup Complete',
        description: 'Database backup has been downloaded successfully',
      });
    } catch (error: any) {
      console.error('Backup error:', error);
      setBackupStatus({
        success: false,
        message: error.message || 'Failed to backup database'
      });
      toast({
        title: 'Backup Failed',
        description: error.message || 'Failed to backup database',
        variant: 'destructive'
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      setBackupStatus(null);

      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      const { data, error } = await supabase.functions.invoke('restore-database', {
        body: { backup: backupData }
      });

      if (error) throw error;

      setBackupStatus({
        success: true,
        message: 'Database restored successfully',
        timestamp: new Date().toISOString()
      });

      toast({
        title: 'Restore Complete',
        description: 'Database has been restored successfully',
      });

      // Reset file input
      event.target.value = '';
      
      // Reload page after a short delay to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Restore error:', error);
      setBackupStatus({
        success: false,
        message: error.message || 'Failed to restore database'
      });
      toast({
        title: 'Restore Failed',
        description: error.message || 'Failed to restore database',
        variant: 'destructive'
      });
      event.target.value = '';
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Database Backup & Restore
        </h2>
        <p className="text-muted-foreground mt-1">
          Backup and restore all database tables for disaster recovery
        </p>
      </div>

      {/* Status Alert */}
      {backupStatus && (
        <Alert variant={backupStatus.success ? 'default' : 'destructive'}>
          {backupStatus.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {backupStatus.message}
            {backupStatus.timestamp && (
              <span className="block text-xs mt-1">
                {format(new Date(backupStatus.timestamp), 'PPpp')}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backup Database
            </CardTitle>
            <CardDescription>
              Export all database tables to a JSON file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <FileJson className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Included Tables</p>
                  <p className="text-muted-foreground text-xs">
                    {tables.length} tables will be backed up
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {tables.slice(0, 5).map((table) => (
                  <Badge key={table} variant="secondary" className="text-xs">
                    {table}
                  </Badge>
                ))}
                {tables.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{tables.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            <Button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="w-full"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Backup time depends on database size. Large databases may take several minutes.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Restore Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore Database
            </CardTitle>
            <CardDescription>
              Restore database from a backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Warning:</strong> Restoring will replace all current data with the backup data. 
                This action cannot be undone. Always create a backup before restoring.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label
                htmlFor="restore-file"
                className="block text-sm font-medium"
              >
                Select Backup File
              </label>
              <input
                id="restore-file"
                type="file"
                accept=".json"
                onChange={handleRestore}
                disabled={isRestoring}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  file:cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {isRestoring && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Restoring database... Please wait.
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Only use backup files created from this system. Invalid files will be rejected.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>Create regular backups before making major changes</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>Store backup files in a secure location outside the system</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>Test restore functionality with non-production data first</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>Keep multiple backup versions for disaster recovery</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-orange-600" />
              <span>Always create a fresh backup before performing a restore operation</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
