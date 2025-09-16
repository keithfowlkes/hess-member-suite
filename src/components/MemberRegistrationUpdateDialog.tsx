import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, User, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { MemberRegistrationUpdate } from '@/hooks/useMemberRegistrationUpdates';

interface MemberRegistrationUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationUpdate: MemberRegistrationUpdate | null;
  onApprove: (registrationUpdateId: string, adminUserId: string, adminNotes?: string) => void;
  onReject: (registrationUpdateId: string, adminUserId: string, adminNotes?: string) => void;
  adminUserId?: string;
  isProcessing?: boolean;
}

export function MemberRegistrationUpdateDialog({
  open,
  onOpenChange,
  registrationUpdate,
  onApprove,
  onReject,
  adminUserId,
  isProcessing = false
}: MemberRegistrationUpdateDialogProps) {
  const [adminNotes, setAdminNotes] = useState('');

  if (!registrationUpdate) {
    return null;
  }

  const regData = registrationUpdate.registration_data;
  const orgData = registrationUpdate.organization_data;

  const handleApprove = () => {
    if (!adminUserId) {
      console.error('Admin user ID is required');
      return;
    }
    onApprove(registrationUpdate.id, adminUserId, adminNotes);
    setAdminNotes('');
    onOpenChange(false);
  };

  const handleReject = () => {
    if (!adminUserId) {
      console.error('Admin user ID is required');
      return;
    }
    onReject(registrationUpdate.id, adminUserId, adminNotes);
    setAdminNotes('');
    onOpenChange(false);
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Member Registration Update</span>
            <Badge className={`${getStatusColor(registrationUpdate.status)} flex items-center gap-1`}>
              {getStatusIcon(registrationUpdate.status)}
              {registrationUpdate.status.charAt(0).toUpperCase() + registrationUpdate.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Submitted Email</Label>
              <p className="text-sm font-semibold">{registrationUpdate.submitted_email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Submission Type</Label>
              <p className="text-sm">{registrationUpdate.submission_type.replace('_', ' ')}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Submitted At</Label>
              <p className="text-sm">{new Date(registrationUpdate.submitted_at).toLocaleDateString()}</p>
            </div>
            {registrationUpdate.existing_organization_name && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Existing Organization</Label>
                <p className="text-sm font-semibold">{registrationUpdate.existing_organization_name}</p>
              </div>
            )}
          </div>

          <Tabs defaultValue="organization" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="organization">Organization Details</TabsTrigger>
              <TabsTrigger value="contact">Contact Information</TabsTrigger>
            </TabsList>

            <TabsContent value="organization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organization Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Organization Name</Label>
                      <p className="font-semibold">{orgData.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Student FTE</Label>
                      <p>{orgData.student_fte || regData.student_fte || 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                    <div className="space-y-1">
                      {orgData.address_line_1 || regData.address ? (
                        <p>{orgData.address_line_1 || regData.address}</p>
                      ) : null}
                      {orgData.address_line_2 && <p>{orgData.address_line_2}</p>}
                      {(orgData.city || regData.city || orgData.state || regData.state) && (
                        <p>{orgData.city || regData.city}{orgData.city || regData.city ? ', ' : ''}{orgData.state || regData.state} {orgData.zip_code || regData.zip}</p>
                      )}
                    </div>
                  </div>

                  {/* System Information */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">System Information</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {[
                        { label: 'Student Information System', value: regData.student_information_system },
                        { label: 'Financial System', value: regData.financial_system },
                        { label: 'Financial Aid', value: regData.financial_aid },
                        { label: 'HCM/HR', value: regData.hcm_hr },
                        { label: 'Payroll System', value: regData.payroll_system },
                        { label: 'Purchasing System', value: regData.purchasing_system },
                        { label: 'Housing Management', value: regData.housing_management },
                        { label: 'Learning Management', value: regData.learning_management },
                        { label: 'Admissions CRM', value: regData.admissions_crm },
                        { label: 'Alumni/Advancement CRM', value: regData.alumni_advancement_crm }
                      ].filter(item => item.value).map((item) => (
                        <div key={item.label}>
                          <span className="font-medium text-muted-foreground">{item.label}:</span>
                          <span className="ml-2">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hardware Information */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">Primary Office Hardware</Label>
                    <div className="flex flex-wrap gap-2">
                      {regData.primary_office_apple && <Badge variant="outline">Apple</Badge>}
                      {regData.primary_office_asus && <Badge variant="outline">ASUS</Badge>}
                      {regData.primary_office_dell && <Badge variant="outline">Dell</Badge>}
                      {regData.primary_office_hp && <Badge variant="outline">HP</Badge>}
                      {regData.primary_office_microsoft && <Badge variant="outline">Microsoft</Badge>}
                      {regData.primary_office_other && <Badge variant="outline">Other: {regData.primary_office_other_details}</Badge>}
                    </div>
                  </div>

                  {regData.other_software_comments && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Additional Software Comments</Label>
                      <p className="text-sm bg-muted/30 p-2 rounded">{regData.other_software_comments}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Primary Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                      <p className="font-semibold">{regData.first_name} {regData.last_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                      <p>{regData.primary_contact_title || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p>{regData.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p>{regData.phone || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Secondary Contact */}
              {(regData.secondary_first_name || regData.secondary_last_name || regData.secondary_contact_email) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Secondary Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                        <p>{regData.secondary_first_name} {regData.secondary_last_name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                        <p>{regData.secondary_contact_title || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p>{regData.secondary_contact_email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Admin Notes */}
          {registrationUpdate.status === 'pending' && (
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add any notes about this approval/rejection..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Previous Admin Notes */}
          {registrationUpdate.admin_notes && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium text-muted-foreground">Admin Notes</Label>
              <p className="text-sm mt-1">{registrationUpdate.admin_notes}</p>
              {registrationUpdate.reviewed_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Reviewed on {new Date(registrationUpdate.reviewed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {registrationUpdate.status === 'pending' ? (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Process
              </Button>
            </div>
          ) : (
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}