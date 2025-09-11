import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComparisonSection } from './ComparisonSection';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Monitor, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye
} from 'lucide-react';

interface ComparisonData {
  organizationChanges?: any[];
  profileChanges?: any[];
  contactChanges?: any[];
  softwareChanges?: any[];
  originalData?: any;
  updatedData?: any;
}

interface UnifiedComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: ComparisonData;
  showActions?: boolean;
  actionNotes?: string;
  onActionNotesChange?: (notes: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  isSubmitting?: boolean;
  children?: React.ReactNode;
}

export function UnifiedComparisonModal({
  open,
  onOpenChange,
  title,
  data,
  showActions = false,
  actionNotes = '',
  onActionNotesChange,
  onApprove,
  onReject,
  isSubmitting = false,
  children
}: UnifiedComparisonModalProps) {
  const hasChanges = (
    (data.organizationChanges && data.organizationChanges.length > 0) ||
    (data.profileChanges && data.profileChanges.length > 0) ||
    (data.contactChanges && data.contactChanges.length > 0) ||
    (data.softwareChanges && data.softwareChanges.length > 0)
  );

  const renderCurrentData = () => {
    if (!data.originalData) return null;

    return (
      <div className="space-y-6">
        {/* Organization Information */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {data.originalData.name || 'Organization Information'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Organization Details</h4>
              <div className="space-y-1 text-sm">
                {data.originalData.address_line_1 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs">
                      {data.originalData.address_line_1}
                      {data.originalData.address_line_2 && `, ${data.originalData.address_line_2}`}
                      {data.originalData.city && `, ${data.originalData.city}`}
                      {data.originalData.state && `, ${data.originalData.state}`}
                      {data.originalData.zip_code && ` ${data.originalData.zip_code}`}
                    </span>
                  </div>
                )}
                {data.originalData.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs">{data.originalData.phone}</span>
                  </div>
                )}
                {data.originalData.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs">{data.originalData.email}</span>
                  </div>
                )}
                {data.originalData.student_fte && (
                  <div className="text-xs">
                    <span className="font-medium">Student FTE:</span> {data.originalData.student_fte.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
              {data.originalData.profiles && (
                <div className="space-y-1 text-xs">
                  <div className="font-medium">Primary Contact</div>
                  <div>{data.originalData.profiles.first_name} {data.originalData.profiles.last_name}</div>
                  {data.originalData.profiles.primary_contact_title && (
                    <div className="text-muted-foreground">{data.originalData.profiles.primary_contact_title}</div>
                  )}
                  <div className="text-primary">{data.originalData.profiles.email}</div>
                </div>
              )}
            </div>

            {/* Software Systems */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Monitor className="h-3 w-3" />
                Software Systems
              </h4>
              <div className="space-y-1 text-xs">
                {data.originalData.student_information_system && (
                  <div><span className="font-medium">SIS:</span> {data.originalData.student_information_system}</div>
                )}
                {data.originalData.financial_system && (
                  <div><span className="font-medium">Financial:</span> {data.originalData.financial_system}</div>
                )}
                {data.originalData.hcm_hr && (
                  <div><span className="font-medium">HCM/HR:</span> {data.originalData.hcm_hr}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {hasChanges ? (
          <Tabs defaultValue="changes" className="space-y-4">
            <TabsList>
              <TabsTrigger value="changes" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Changes Review
              </TabsTrigger>
              <TabsTrigger value="current">Current Information</TabsTrigger>
            </TabsList>

            <TabsContent value="changes" className="space-y-4">
              {data.organizationChanges && data.organizationChanges.length > 0 && (
                <ComparisonSection
                  title="Organization Details"
                  icon={<Building2 className="h-4 w-4" />}
                  items={data.organizationChanges}
                />
              )}

              {data.profileChanges && data.profileChanges.length > 0 && (
                <ComparisonSection
                  title="Contact Information"
                  icon={<User className="h-4 w-4" />}
                  items={data.profileChanges}
                />
              )}

              {data.contactChanges && data.contactChanges.length > 0 && (
                <ComparisonSection
                  title="Contact Details"
                  icon={<Mail className="h-4 w-4" />}
                  items={data.contactChanges}
                />
              )}

              {data.softwareChanges && data.softwareChanges.length > 0 && (
                <ComparisonSection
                  title="Software Systems"
                  icon={<Monitor className="h-4 w-4" />}
                  items={data.softwareChanges}
                />
              )}
            </TabsContent>

            <TabsContent value="current" className="space-y-4">
              {renderCurrentData()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {renderCurrentData()}
            {children}
          </div>
        )}

        {showActions && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="action-notes">Admin Notes (optional)</Label>
              <Textarea
                id="action-notes"
                placeholder="Add any notes about this decision..."
                value={actionNotes}
                onChange={(e) => onActionNotesChange?.(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onApprove}
                disabled={isSubmitting}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                variant="destructive"
                onClick={onReject}
                disabled={isSubmitting}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {children}
      </DialogContent>
    </Dialog>
  );
}