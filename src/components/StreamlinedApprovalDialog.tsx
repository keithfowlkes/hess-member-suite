import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PendingRegistration } from '@/hooks/usePendingRegistrations';
import { useAuth } from '@/hooks/useAuth';
import { useSendInvoice } from '@/hooks/useSendInvoice';
import { useFeeTiers } from '@/hooks/useFeeTiers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  DollarSign, 
  Calendar, 
  FileText, 
  Eye, 
  Flag,
  User,
  Building,
  MapPin,
  Phone,
  Loader2,
  Search,
  AlertCircle
} from 'lucide-react';

interface StreamlinedApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: PendingRegistration | null;
  onApprove: (registrationId: string, adminUserId?: string, selectedFeeTier?: number) => Promise<boolean | { success: boolean; organizationId?: string }>;
  onReject: (registrationId: string, reason: string, adminUserId?: string) => Promise<boolean>;
  onUpdatePriority?: (registrationId: string, priority: string, adminUserId?: string) => Promise<boolean>;
}

export function StreamlinedApprovalDialog({
  open,
  onOpenChange,
  registration,
  onApprove,
  onReject,
  onUpdatePriority
}: StreamlinedApprovalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'priority' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [priority, setPriority] = useState('normal');
  const [adminNotes, setAdminNotes] = useState('');
  
  // Invoice options
  const [sendInvoice, setSendInvoice] = useState(false);
  const [selectedFeeTier, setSelectedFeeTier] = useState('full');
  const [invoiceAmount, setInvoiceAmount] = useState('1000');
  const [membershipStartDate, setMembershipStartDate] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // AI Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  
  const { user } = useAuth();
  const sendInvoiceMutation = useSendInvoice();
  const { feeTiers } = useFeeTiers();

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setActionType(null);
      setRejectionReason('');
      setPriority('normal');
      setAdminNotes('');
      setSendInvoice(false);
      setSelectedFeeTier('full');
      setMembershipStartDate('');
      setInvoiceNotes('');
      setVerificationResult(null);
      // Set default invoice amount to full member fee when dialog opens
      const fullTier = feeTiers.find(t => t.id === 'full');
      if (fullTier) {
        setInvoiceAmount(fullTier.amount.toString());
      }
    }
  }, [open, feeTiers]);

  // AI Verification handler
  const handleAIVerification = async () => {
    if (!registration) return;
    
    setIsVerifying(true);
    setVerificationResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-contact-ai', {
        body: {
          organizationName: registration.organization_name,
          firstName: registration.first_name,
          lastName: registration.last_name,
          title: registration.primary_contact_title || null
        }
      });

      if (error) {
        console.error('AI verification error:', error);
        toast.error('Failed to verify contact: ' + error.message);
        return;
      }

      if (data?.success) {
        setVerificationResult(data.result);
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

  const calculateProratedAmount = () => {
    if (!membershipStartDate || !invoiceAmount) return null;
    
    const membershipStart = new Date(membershipStartDate);
    const currentYear = new Date().getFullYear();
    const yearEnd = new Date(currentYear, 11, 31);
    const yearStart = new Date(currentYear, 0, 1);
    
    if (membershipStart <= yearStart) return null;
    
    const totalDays = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((yearEnd.getTime() - membershipStart.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.round((parseFloat(invoiceAmount) * remainingDays / totalDays) * 100) / 100;
  };

  const handleAction = async () => {
    if (!registration || !actionType) return;
    
    setIsSubmitting(true);
    try {
      if (actionType === 'approve') {
        const result = await onApprove(registration.id, user?.id, parseFloat(invoiceAmount));
        
        // Handle invoice sending if requested
        if (sendInvoice && membershipStartDate) {
          let organizationId = registration.id;
          if (typeof result === 'object' && result && 'organizationId' in result && result.organizationId) {
            organizationId = result.organizationId;
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await sendInvoiceMutation.mutateAsync({
            organizationId,
            organizationName: registration.organization_name,
            organizationEmail: registration.email,
            membershipStartDate,
            invoiceAmount: parseFloat(invoiceAmount),
            proratedAmount: calculateProratedAmount(),
            periodStartDate: new Date(membershipStartDate).toISOString().split('T')[0],
            periodEndDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
            notes: invoiceNotes || undefined
          });
        }
        
        onOpenChange(false);
      } else if (actionType === 'reject' && rejectionReason.trim()) {
        await onReject(registration.id, rejectionReason, user?.id);
        onOpenChange(false);
      } else if (actionType === 'priority' && onUpdatePriority) {
        await onUpdatePriority(registration.id, priority, user?.id);
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registration) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const currentPriority = (registration as any).priority_level || 'normal';
  const proratedAmount = calculateProratedAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {registration.organization_name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAIVerification}
                disabled={isVerifying}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    AI Verify Contact
                  </>
                )}
              </Button>
              <Badge variant="outline" className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(currentPriority)}`} />
                {currentPriority} priority
              </Badge>
              <Badge variant="secondary">
                {new Date(registration.created_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* AI Verification Result */}
        {verificationResult && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              AI Verification Result
            </h4>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap prose prose-sm max-w-none">
              {verificationResult.split('\n').map((line, index) => {
                if (line.startsWith('**Verification Status:**')) {
                  const status = line.replace('**Verification Status:**', '').trim().toLowerCase();
                  return (
                    <div key={index} className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Verification Status:</span>
                      {status.includes('yes') ? (
                        <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                      ) : status.includes('no') ? (
                        <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Verified</Badge>
                      ) : (
                        <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unable to Verify</Badge>
                      )}
                    </div>
                  );
                }
                if (line.startsWith('**')) {
                  const parts = line.split(':**');
                  const label = parts[0].replace(/\*\*/g, '');
                  const value = parts.slice(1).join(':**').trim();
                  return (
                    <div key={index} className="mb-1">
                      <span className="font-semibold">{label}:</span> {value}
                    </div>
                  );
                }
                return line ? <p key={index} className="mb-1">{line}</p> : null;
              })}
            </div>
          </div>
        )}
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="systems">Systems</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-blue-500" />
                    <div>
                      <h3 className="font-medium">{registration.first_name} {registration.last_name}</h3>
                      <p className="text-sm text-gray-600">{registration.primary_contact_title || 'Contact'}</p>
                      <p className="text-sm text-blue-600">{registration.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-green-500" />
                    <div>
                      <h3 className="font-medium">{registration.organization_name}</h3>
                      <p className="text-sm text-gray-600">
                        {registration.is_private_nonprofit ? 'Private Non-Profit' : 'Public Institution'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Student FTE: {registration.student_fte || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(registration.address || registration.city) && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Address</h4>
                      <div className="text-sm text-gray-600">
                        {registration.address && <div>{registration.address}</div>}
                        {(registration.city || registration.state) && (
                          <div>
                            {registration.city}
                            {registration.city && registration.state && ', '}
                            {registration.state} {registration.zip}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            {/* Secondary Contact */}
            {(registration.secondary_first_name || registration.secondary_contact_email) && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Secondary Contact</h4>
                  <div className="text-sm space-y-1">
                    {registration.secondary_first_name && (
                      <div>Name: {registration.secondary_first_name} {registration.secondary_last_name}</div>
                    )}
                    {registration.secondary_contact_title && (
                      <div>Title: {registration.secondary_contact_title}</div>
                    )}
                    {registration.secondary_contact_email && (
                      <div>Email: {registration.secondary_contact_email}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hardware */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Primary Office Hardware</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'primary_office_apple', label: 'Apple' },
                    { key: 'primary_office_lenovo', label: 'Lenovo' },
                    { key: 'primary_office_dell', label: 'Dell' },
                    { key: 'primary_office_hp', label: 'HP' },
                    { key: 'primary_office_microsoft', label: 'Microsoft' },
                  ].filter(item => registration[item.key as keyof PendingRegistration] === true)
                   .map(item => (
                    <Badge key={item.key} variant="outline">{item.label}</Badge>
                  ))}
                  {registration.primary_office_other && (
                    <Badge variant="outline">Other: {registration.primary_office_other_details}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            {registration.other_software_comments && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Additional Comments</h4>
                  <p className="text-sm text-gray-700">{registration.other_software_comments}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="systems" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'VoIP', value: registration.voip },
                { label: 'Network Infrastructure', value: registration.network_infrastructure },
                { label: 'Student Information System', value: registration.student_information_system },
                { label: 'Financial System', value: registration.financial_system },
                { label: 'Financial Aid', value: registration.financial_aid },
                { label: 'HCM/HR', value: registration.hcm_hr },
                { label: 'Payroll System', value: registration.payroll_system },
                { label: 'Purchasing System', value: registration.purchasing_system },
                { label: 'Housing Management', value: registration.housing_management },
                { label: 'Learning Management', value: registration.learning_management },
                { label: 'Admissions CRM', value: registration.admissions_crm },
                { label: 'Alumni/Advancement CRM', value: registration.alumni_advancement_crm },
              ].filter(item => item.value).map(item => (
                <Card key={item.label}>
                  <CardContent className="p-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-gray-600">{item.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="actions" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => setActionType('approve')}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 h-16 flex flex-col items-center justify-center gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Approve Registration</span>
              </Button>
              
              <Button
                onClick={() => setActionType('reject')}
                disabled={isSubmitting}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 h-16 flex flex-col items-center justify-center gap-2"
              >
                <XCircle className="h-5 w-5" />
                <span>Reject Registration</span>
              </Button>
              
              <Button
                onClick={() => setActionType('priority')}
                disabled={isSubmitting}
                variant="outline"
                className="h-16 flex flex-col items-center justify-center gap-2"
              >
                <Flag className="h-5 w-5" />
                <span>Update Priority</span>
              </Button>
            </div>

            {/* Action Forms */}
            {actionType === 'approve' && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Approve Registration
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="send-invoice" 
                      checked={sendInvoice}
                      onCheckedChange={(checked) => {
                        setSendInvoice(checked as boolean);
                        if (checked) {
                          const today = new Date();
                          setMembershipStartDate(today.toISOString().split('T')[0]);
                        }
                      }}
                    />
                    <Label htmlFor="send-invoice">Send prorated membership invoice</Label>
                  </div>

                  {sendInvoice && (
                    <div className="space-y-4 pl-6 border-l-2 border-green-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Annual Fee Tier</Label>
                          <Select 
                            value={selectedFeeTier} 
                            onValueChange={(value) => {
                              setSelectedFeeTier(value);
                              const tier = feeTiers.find(t => t.id === value);
                              if (tier) {
                                setInvoiceAmount(tier.amount.toString());
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select fee tier" />
                            </SelectTrigger>
                            <SelectContent>
                              {feeTiers.map((tier) => (
                                <SelectItem key={tier.id} value={tier.id}>
                                  {tier.name} - ${tier.amount.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Membership Start Date</Label>
                          <Input
                            type="date"
                            value={membershipStartDate}
                            onChange={(e) => setMembershipStartDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {proratedAmount && (
                        <div className="bg-green-50 p-3 rounded border">
                          <div className="text-sm">
                            <div>Full Annual Fee: <span className="font-medium">${parseFloat(invoiceAmount).toLocaleString()}</span></div>
                            <div>Prorated Amount: <span className="font-bold text-green-600">${proratedAmount.toLocaleString()}</span></div>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label>Invoice Notes (Optional)</Label>
                        <Textarea
                          value={invoiceNotes}
                          onChange={(e) => setInvoiceNotes(e.target.value)}
                          placeholder="Additional notes for the invoice..."
                          rows={2}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActionType(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAction}
                      disabled={isSubmitting || (sendInvoice && !membershipStartDate)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {sendInvoice ? 'Approve & Send Invoice' : 'Approve Registration'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {actionType === 'reject' && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Reject Registration
                  </h3>
                  
                  <div>
                    <Label>Rejection Reason</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a clear reason for rejection..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActionType(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAction}
                      disabled={isSubmitting || !rejectionReason.trim()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Registration
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {actionType === 'priority' && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Flag className="h-5 w-5 text-blue-600" />
                    Update Priority Level
                  </h3>
                  
                  <div>
                    <Label>Priority Level</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-500" />
                            Low Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            Normal Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            High Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="urgent">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            Urgent Priority
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Admin Notes (Optional)</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Internal notes about this priority change..."
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActionType(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAction}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Flag className="h-4 w-4 mr-2" />
                          Update Priority
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}