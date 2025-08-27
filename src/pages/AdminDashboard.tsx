import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Building2, 
  Clock, 
  Mail, 
  CheckCircle, 
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useOrganizationApprovals } from '@/hooks/useOrganizationApprovals';
import { useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';
import { OrganizationApprovalDialog } from '@/components/OrganizationApprovalDialog';
import { InvitationManagementDialog } from '@/components/InvitationManagementDialog';
import { ReassignmentRequestsDialog } from '@/components/ReassignmentRequestsDialog';

const AdminDashboard = () => {
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [showReassignmentDialog, setShowReassignmentDialog] = useState(false);

  const { 
    pendingOrganizations, 
    loading: approvalsLoading, 
    approveOrganization, 
    rejectOrganization 
  } = useOrganizationApprovals();

  const { invitations, loading: invitationsLoading } = useOrganizationInvitations();

  const handleReviewOrganization = (org) => {
    setSelectedOrganization(org);
    setShowApprovalDialog(true);
  };

  const stats = [
    {
      title: 'Pending Approvals',
      value: pendingOrganizations.length,
      icon: Clock,
      color: 'text-orange-600',
      description: 'Organizations awaiting review'
    },
    {
      title: 'Active Invitations',
      value: invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date()).length,
      icon: Mail,
      color: 'text-blue-600',
      description: 'Pending email invitations'
    },
    {
      title: 'Expired Invitations',
      value: invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) <= new Date()).length,
      icon: AlertCircle,
      color: 'text-red-600',
      description: 'Invitations that have expired'
    },
    {
      title: 'Completed Invitations',
      value: invitations.filter(inv => inv.used_at).length,
      icon: CheckCircle,
      color: 'text-green-600',
      description: 'Successfully accepted invitations'
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Manage organization applications and invitations
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="approvals" className="space-y-4">
              <TabsList>
                <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
                <TabsTrigger value="invitations">Manage Invitations</TabsTrigger>
                <TabsTrigger value="reassignments">Reassignment Requests</TabsTrigger>
              </TabsList>

              <TabsContent value="approvals" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Organization Applications</h2>
                  <Badge variant="secondary" className="text-sm">
                    {pendingOrganizations.length} pending
                  </Badge>
                </div>

                {approvalsLoading ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">Loading pending organizations...</div>
                    </CardContent>
                  </Card>
                ) : pendingOrganizations.length === 0 ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No pending organization applications.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {pendingOrganizations.map((org) => (
                      <Card key={org.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">{org.name}</h3>
                                <Badge variant={org.profiles?.is_private_nonprofit ? "default" : "destructive"}>
                                  {org.profiles?.is_private_nonprofit ? "Private Non-Profit" : "Not Confirmed"}
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  <span>
                                    Contact: {org.profiles?.first_name} {org.profiles?.last_name}
                                    {org.profiles?.primary_contact_title && ` - ${org.profiles.primary_contact_title}`}
                                  </span>
                                </div>
                                <div>
                                  Email: {org.profiles?.email} | Location: {org.city}, {org.state}
                                </div>
                                <div>
                                  Student FTE: {org.student_fte?.toLocaleString() || 'Not specified'} | 
                                  Applied: {new Date(org.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewOrganization(org)}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-3 w-3" />
                                Review
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="invitations" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Organization Invitations</h2>
                  <Button onClick={() => setShowInvitationDialog(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Manage Invitations
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Click "Manage Invitations" to send invitations to organizations without contacts.</p>
                      <p className="text-sm mt-2">
                        This allows existing organizations in your database to gain portal access.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              <TabsContent value="reassignments" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Organization Reassignment Requests</h2>
                  <Button onClick={() => setShowReassignmentDialog(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    View Requests
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Manage organization reassignment requests and approve changes.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <OrganizationApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        organization={selectedOrganization}
        onApprove={approveOrganization}
        onReject={rejectOrganization}
      />

      <InvitationManagementDialog
        open={showInvitationDialog}
        onOpenChange={setShowInvitationDialog}
      />

      <ReassignmentRequestsDialog
        open={showReassignmentDialog}
        onOpenChange={setShowReassignmentDialog}
      />
    </SidebarProvider>
  );
};

export default AdminDashboard;