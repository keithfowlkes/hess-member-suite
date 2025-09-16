import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, CheckCircle, XCircle, Eye, Building2, User } from 'lucide-react';
import { useMemberRegistrationUpdates, MemberRegistrationUpdate } from '@/hooks/useMemberRegistrationUpdates';
import { MemberRegistrationUpdateDialog } from '@/components/MemberRegistrationUpdateDialog';
import { useAuth } from '@/hooks/useAuth';

export function SimplifiedMemberRegistrationManagement() {
  const { user } = useAuth();
  const { 
    registrationUpdates, 
    isLoading, 
    processRegistrationUpdate,
    isProcessing
  } = useMemberRegistrationUpdates();

  const [selectedUpdate, setSelectedUpdate] = useState<MemberRegistrationUpdate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('submitted_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort registration updates
  const filteredAndSortedUpdates = useMemo(() => {
    let filtered = registrationUpdates.filter(update => {
      const matchesSearch = searchTerm === '' || 
        (update.organization_data?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.submitted_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (update.registration_data?.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (update.registration_data?.last_name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || update.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'submitted_at':
          aValue = new Date(a.submitted_at);
          bValue = new Date(b.submitted_at);
          break;
        case 'organization_name':
          aValue = (a.organization_data?.name || '').toLowerCase();
          bValue = (b.organization_data?.name || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [registrationUpdates, searchTerm, statusFilter, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = registrationUpdates.length;
    const pending = registrationUpdates.filter(u => u.status === 'pending').length;
    const approved = registrationUpdates.filter(u => u.status === 'approved').length;
    const rejected = registrationUpdates.filter(u => u.status === 'rejected').length;

    return { total, pending, approved, rejected };
  }, [registrationUpdates]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading registration updates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Member Registration Updates</h2>
        <p className="text-muted-foreground mt-1">
          Review and process member registration updates and primary contact changes
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search updates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_at">Date Submitted</SelectItem>
                <SelectItem value="organization_name">Organization</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Registration Updates List */}
      <div className="space-y-4">
        {filteredAndSortedUpdates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No registration updates found</h3>
              <p className="text-muted-foreground">
                {registrationUpdates.length === 0 
                  ? "No registration updates have been submitted yet."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedUpdates.map((update) => (
            <Card key={update.id} className="transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {update.organization_data?.name || 'Unnamed Organization'}
                      </h3>
                      <Badge className={`${getStatusColor(update.status)} flex items-center gap-1`}>
                        {getStatusIcon(update.status)}
                        {update.status.charAt(0).toUpperCase() + update.status.slice(1)}
                      </Badge>
                      <Badge variant="outline">
                        {update.submission_type.replace('_', ' ')}
                      </Badge>
                      {update.existing_organization_name && (
                        <Badge variant="secondary">
                          Replacing: {update.existing_organization_name}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <strong>Contact:</strong> {update.registration_data?.first_name} {update.registration_data?.last_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          <strong>Email:</strong> {update.submitted_email}
                        </div>
                      </div>
                      <div>
                        <strong>Submitted:</strong> {new Date(update.submitted_at).toLocaleDateString()}
                      </div>
                    </div>

                    {update.registration_data?.city && update.registration_data?.state && (
                      <div className="text-sm text-muted-foreground mt-2">
                        <strong>Location:</strong> {update.registration_data.city}, {update.registration_data.state}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => setSelectedUpdate(update)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Registration Update Dialog */}
      <MemberRegistrationUpdateDialog
        open={!!selectedUpdate}
        onOpenChange={(open) => !open && setSelectedUpdate(null)}
        registrationUpdate={selectedUpdate}
        onApprove={(registrationUpdateId, adminUserId, adminNotes) => 
          processRegistrationUpdate({
            registrationUpdateId,
            action: 'approve',
            adminUserId,
            adminNotes
          })
        }
        onReject={(registrationUpdateId, adminUserId, adminNotes) => 
          processRegistrationUpdate({
            registrationUpdateId,
            action: 'reject',
            adminUserId,
            adminNotes
          })
        }
        adminUserId={user?.id}
        isProcessing={isProcessing}
      />
    </div>
  );
}