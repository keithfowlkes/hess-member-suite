import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
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
  Clock,
  History,
  RefreshCw,
  Calendar,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

interface StoredBackup {
  id: string;
  backup_data: any;
  backup_size: number;
  created_at: string;
  backup_type: 'manual' | 'scheduled';
  table_count: number;
  row_count: number;
}

export function DatabaseBackupRestore() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);
  const [storedBackups, setStoredBackups] = useState<StoredBackup[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [frequency, setFrequency] = useState('daily');
  const [time, setTime] = useState('02:00');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const { toast } = useToast();

  // Fetch stored backups
  useEffect(() => {
    fetchStoredBackups();
    fetchScheduleSettings();
  }, []);

  const fetchScheduleSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'backup_schedule_enabled',
          'backup_schedule_frequency',
          'backup_schedule_time',
          'backup_schedule_day_of_week',
          'backup_schedule_day_of_month'
        ]);

      if (error) throw error;

      const settingsMap = new Map(data?.map(s => [s.setting_key, s.setting_value]) || []);
      setScheduleEnabled(settingsMap.get('backup_schedule_enabled') === 'true');
      setFrequency(settingsMap.get('backup_schedule_frequency') || 'daily');
      setTime(settingsMap.get('backup_schedule_time') || '02:00');
      setDayOfWeek(settingsMap.get('backup_schedule_day_of_week') || '1');
      setDayOfMonth(settingsMap.get('backup_schedule_day_of_month') || '1');
    } catch (error: any) {
      console.error('Error fetching schedule settings:', error);
    }
  };

  const fetchStoredBackups = async () => {
    try {
      setLoadingBackups(true);
      const { data, error } = await supabase
        .from('database_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setStoredBackups((data || []) as StoredBackup[]);
    } catch (error: any) {
      console.error('Error fetching backups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load backup history',
        variant: 'destructive'
      });
    } finally {
      setLoadingBackups(false);
    }
  };

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
        description: 'Database backup has been downloaded and saved',
      });

      // Refresh stored backups list
      await fetchStoredBackups();
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
      
      // Refresh stored backups and reload page after a short delay
      await fetchStoredBackups();
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

  const handleDownloadStoredBackup = (backup: StoredBackup) => {
    try {
      const backupData = JSON.stringify(backup.backup_data, null, 2);
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hess-backup-${format(new Date(backup.created_at), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: 'Backup file downloaded successfully',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download backup',
        variant: 'destructive'
      });
    }
  };

  const handleRestoreStoredBackup = async (backup: StoredBackup) => {
    try {
      setIsRestoring(true);
      setBackupStatus(null);

      const { data, error } = await supabase.functions.invoke('restore-database', {
        body: { backup: backup.backup_data }
      });

      if (error) throw error;

      setBackupStatus({
        success: true,
        message: 'Database restored successfully from stored backup',
        timestamp: new Date().toISOString()
      });

      toast({
        title: 'Restore Complete',
        description: 'Database has been restored successfully',
      });

      // Reload page after a short delay
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
    } finally {
      setIsRestoring(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const updates = [
        { setting_key: 'backup_schedule_enabled', setting_value: scheduleEnabled.toString() },
        { setting_key: 'backup_schedule_frequency', setting_value: frequency },
        { setting_key: 'backup_schedule_time', setting_value: time },
        { setting_key: 'backup_schedule_day_of_week', setting_value: dayOfWeek },
        { setting_key: 'backup_schedule_day_of_month', setting_value: dayOfMonth }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ setting_value: update.setting_value })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }

      toast({
        title: 'Schedule Updated',
        description: 'Backup schedule has been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save backup schedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingSchedule(false);
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

      {/* Automated Backup Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automated Backup Schedule
          </CardTitle>
          <CardDescription>
            Configure when automated backups should run
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="schedule-enabled">Enable Automated Backups</Label>
              <p className="text-sm text-muted-foreground">
                Automatically backup your database on a schedule
              </p>
            </div>
            <Switch
              id="schedule-enabled"
              checked={scheduleEnabled}
              onCheckedChange={setScheduleEnabled}
            />
          </div>

          {scheduleEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Time when the backup should run (24-hour format)
                </p>
              </div>

              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="day-of-week">Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger id="day-of-week">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                      <SelectItem value="7">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="day-of-month">Day of Month</Label>
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                    <SelectTrigger id="day-of-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Limited to days 1-28 to ensure the date exists in all months
                  </p>
                </div>
              )}

              <Button 
                onClick={handleSaveSchedule} 
                disabled={isSavingSchedule}
                className="w-full"
              >
                {isSavingSchedule ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Save Schedule
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Backup History (Last 3)
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStoredBackups}
              disabled={loadingBackups}
            >
              {loadingBackups ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            {scheduleEnabled 
              ? `Automated backups run ${frequency} at ${time}. Only the last 3 backups are retained.`
              : 'Automated backups are disabled. Only the last 3 manual backups are retained.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBackups ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : storedBackups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Tables</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storedBackups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {format(new Date(backup.created_at), 'PPp')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(backup.created_at), 'zzz')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={backup.backup_type === 'manual' ? 'default' : 'secondary'}>
                        {backup.backup_type === 'manual' ? 'Manual' : 'Scheduled'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatBytes(backup.backup_size)}</TableCell>
                    <TableCell>{backup.table_count}</TableCell>
                    <TableCell>{backup.row_count?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadStoredBackup(backup)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRestoreStoredBackup(backup)}
                          disabled={isRestoring}
                        >
                          {isRestoring ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-1" />
                          )}
                          Restore
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No backups available yet</p>
              <p className="text-xs mt-1">Create your first backup or wait for the scheduled backup</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Automated Backup Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Daily at 2:00 AM:</strong> The system automatically creates a backup of all database tables.
              Only the 3 most recent backups are kept, older backups are automatically deleted.
            </AlertDescription>
          </Alert>

          <div className="text-sm space-y-2">
            <p className="font-medium">Best Practices:</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                <span>Scheduled backups provide automated disaster recovery</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                <span>Download important backups to external storage for safekeeping</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                <span>Create manual backups before making major system changes</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-orange-600" />
                <span>Always create a fresh backup before performing a restore operation</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
