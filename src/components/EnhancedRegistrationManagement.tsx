import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Clock, CheckCircle, XCircle, AlertTriangle, BarChart3, Flag, Eye } from 'lucide-react';
import { PendingRegistration, usePendingRegistrations } from '@/hooks/usePendingRegistrations';
import { BulkRegistrationActions } from '@/components/BulkRegistrationActions';
import { StreamlinedApprovalDialog } from '@/components/StreamlinedApprovalDialog';
import { RegistrationAnalyticsDashboard } from '@/components/RegistrationAnalyticsDashboard';
import { useAuth } from '@/hooks/useAuth';

export function EnhancedRegistrationManagement() {
  const { user } = useAuth();
  const { 
    pendingRegistrations, 
    loading, 
    approveRegistration, 
    rejectRegistration,
    bulkApprove,
    bulkReject,
    bulkUpdatePriority,
    updatePriority
  } = usePendingRegistrations();

  // Local state
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort registrations
  const filteredAndSortedRegistrations = useMemo(() => {
    let filtered = pendingRegistrations.filter(registration => {
      const matchesSearch = searchTerm === '' || 
        registration.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registration.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${registration.first_name} ${registration.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

      const priority = (registration as any).priority_level || 'normal';
      const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;

      const matchesOrganization = organizationFilter === 'all' || 
        registration.organization_name.toLowerCase().includes(organizationFilter.toLowerCase());

      const matchesState = stateFilter === 'all' || registration.state === stateFilter;

      return matchesSearch && matchesPriority && matchesOrganization && matchesState;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'organization_name':
          aValue = a.organization_name.toLowerCase();
          bValue = b.organization_name.toLowerCase();
          break;
        case 'priority_level':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          aValue = priorityOrder[(a as any).priority_level || 'normal'];
          bValue = priorityOrder[(b as any).priority_level || 'normal'];
          break;
        case 'student_fte':
          aValue = a.student_fte || 0;
          bValue = b.student_fte || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [pendingRegistrations, searchTerm, priorityFilter, organizationFilter, stateFilter, sortBy, sortOrder]);

  // Get unique values for filters
  const uniqueStates = useMemo(() => {
    const states = pendingRegistrations
      .map(r => r.state)
      .filter(Boolean)
      .filter((state, index, self) => self.indexOf(state) === index)
      .sort();
    return states;
  }, [pendingRegistrations]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <Flag className="h-4 w-4" />;
      case 'normal': return <Clock className="h-4 w-4" />;
      case 'low': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = pendingRegistrations.length;
    const priorityCounts = pendingRegistrations.reduce((acc, r) => {
      const priority = (r as any).priority_level || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgStudentFte = pendingRegistrations.length > 0 
      ? Math.round(pendingRegistrations
          .filter(r => r.student_fte)
          .reduce((sum, r) => sum + (r.student_fte || 0), 0) / 
          pendingRegistrations.filter(r => r.student_fte).length)
      : 0;

    return {
      total,
      urgent: priorityCounts.urgent || 0,
      high: priorityCounts.high || 0,
      normal: priorityCounts.normal || 0,
      low: priorityCounts.low || 0,
      avgStudentFte
    };
  }, [pendingRegistrations]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>Loading registrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="registrations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registrations" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Registration Management
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pending</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Urgent</p>
                    <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">High Priority</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
                  </div>
                  <Flag className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Normal</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.normal}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. FTE</p>
                    <p className="text-2xl font-bold text-green-600">{stats.avgStudentFte}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search registrations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date Submitted</SelectItem>
                    <SelectItem value="organization_name">Organization</SelectItem>
                    <SelectItem value="priority_level">Priority</SelectItem>
                    <SelectItem value="student_fte">Student FTE</SelectItem>
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

                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setPriorityFilter('all');
                    setStateFilter('all');
                    setSortBy('created_at');
                    setSortOrder('desc');
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          <BulkRegistrationActions
            registrations={filteredAndSortedRegistrations}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onBulkApprove={bulkApprove}
            onBulkReject={bulkReject}
            onBulkPriorityUpdate={bulkUpdatePriority}
            adminUserId={user?.id}
          />

          {/* Registration List */}
          <div className="space-y-4">
            {filteredAndSortedRegistrations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations found</h3>
                  <p className="text-gray-600">
                    {pendingRegistrations.length === 0 
                      ? "No pending registrations at this time."
                      : "Try adjusting your search or filter criteria."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAndSortedRegistrations.map((registration) => {
                const priority = (registration as any).priority_level || 'normal';
                const isSelected = selectedIds.includes(registration.id);
                
                return (
                  <Card key={registration.id} className={`transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds([...selectedIds, registration.id]);
                              } else {
                                setSelectedIds(selectedIds.filter(id => id !== registration.id));
                              }
                            }}
                          />

                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {registration.organization_name}
                              </h3>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${getPriorityColor(priority)}`} />
                                {priority}
                              </Badge>
                              {registration.is_private_nonprofit && (
                                <Badge variant="secondary">Private Non-Profit</Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div>
                                <strong>Contact:</strong> {registration.first_name} {registration.last_name}
                                <br />
                                <strong>Email:</strong> {registration.email}
                              </div>
                              <div>
                                <strong>Location:</strong> {registration.city}, {registration.state}
                                <br />
                                <strong>Student FTE:</strong> {registration.student_fte || 'Not specified'}
                              </div>
                              <div>
                                <strong>Submitted:</strong> {new Date(registration.created_at).toLocaleDateString()}
                                <br />
                                <strong>Title:</strong> {registration.primary_contact_title || 'Not specified'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => setSelectedRegistration(registration)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <RegistrationAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Streamlined Approval Dialog */}
      <StreamlinedApprovalDialog
        open={!!selectedRegistration}
        onOpenChange={(open) => !open && setSelectedRegistration(null)}
        registration={selectedRegistration}
        onApprove={approveRegistration}
        onReject={rejectRegistration}
        onUpdatePriority={updatePriority}
      />
    </div>
  );
}