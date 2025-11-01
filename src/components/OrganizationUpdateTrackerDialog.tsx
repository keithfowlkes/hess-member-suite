import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  email?: string;
  state?: string;
  city?: string;
  updated_at: string;
  membership_status?: string;
  student_fte?: number;
}

interface OrganizationUpdateTrackerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Organization[];
}

export function OrganizationUpdateTrackerDialog({
  open,
  onOpenChange,
  organizations,
}: OrganizationUpdateTrackerDialogProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { updatedOrgs, notUpdatedOrgs } = useMemo(() => {
    if (!startDate || !endDate) {
      return { updatedOrgs: [], notUpdatedOrgs: [] };
    }

    const updated: Organization[] = [];
    const notUpdated: Organization[] = [];

    organizations.forEach((org) => {
      const orgUpdateDate = new Date(org.updated_at);
      if (orgUpdateDate >= startDate && orgUpdateDate <= endDate) {
        updated.push(org);
      } else {
        notUpdated.push(org);
      }
    });

    return { updatedOrgs: updated, notUpdatedOrgs: notUpdated };
  }, [organizations, startDate, endDate]);

  const downloadCSV = (orgs: Organization[], filename: string) => {
    const headers = ['Organization Name', 'Email', 'City', 'State', 'Status', 'Student FTE', 'Last Updated'];
    const rows = orgs.map(org => [
      org.name,
      org.email || '',
      org.city || '',
      org.state || '',
      org.membership_status || '',
      org.student_fte?.toString() || '',
      format(new Date(org.updated_at), 'MM/dd/yyyy HH:mm:ss'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadUpdated = () => {
    const filename = `organizations-updated-${format(startDate!, 'yyyy-MM-dd')}-to-${format(endDate!, 'yyyy-MM-dd')}.csv`;
    downloadCSV(updatedOrgs, filename);
  };

  const handleDownloadNotUpdated = () => {
    const filename = `organizations-not-updated-${format(startDate!, 'yyyy-MM-dd')}-to-${format(endDate!, 'yyyy-MM-dd')}.csv`;
    downloadCSV(notUpdatedOrgs, filename);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Organization Update Tracker</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {startDate && endDate && (
            <>
              {/* Updated Organizations */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Updated Organizations ({updatedOrgs.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={handleDownloadUpdated}
                    disabled={updatedOrgs.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {updatedOrgs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No organizations updated within this date range
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {updatedOrgs.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{org.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Updated: {format(new Date(org.updated_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          {org.state && (
                            <Badge variant="outline" className="ml-2 flex-shrink-0">
                              {org.state}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Not Updated Organizations */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Not Updated Organizations ({notUpdatedOrgs.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={handleDownloadNotUpdated}
                    disabled={notUpdatedOrgs.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {notUpdatedOrgs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All organizations updated within this date range
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notUpdatedOrgs.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{org.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Last updated: {format(new Date(org.updated_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          {org.state && (
                            <Badge variant="outline" className="ml-2 flex-shrink-0">
                              {org.state}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!startDate && !endDate && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a date range to view organization update status</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
