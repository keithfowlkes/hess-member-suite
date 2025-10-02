import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Monitor, 
  CheckCircle, 
  XCircle, 
  Eye,
  AlertTriangle
} from 'lucide-react';

interface ComparisonData {
  organizationChanges?: any[];
  profileChanges?: any[];
  contactChanges?: any[];
  softwareChanges?: any[];
  originalData?: any;
  updatedData?: any;
}

interface SideBySideComparisonModalProps {
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

export function SideBySideComparisonModal({
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
}: SideBySideComparisonModalProps) {
  const formatValue = (value: any, type = 'text', showUnchanged = false): string => {
    if (value === null || value === undefined || value === '') {
      return showUnchanged ? 'Unchanged' : 'Not set';
    }
    
    switch (type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'array':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'currency':
        return typeof value === 'number' ? `$${value.toLocaleString()}` : String(value);
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      default:
        return String(value);
    }
  };

  const renderValueCell = (value: any, type = 'text', isChanged = false, isHighlighted = false, isNewValue = false, originalValue?: any, showAsUnchanged = false) => {
    const isEmpty = value === null || value === undefined || value === '';
    
    // Debug for Software Systems values
    if (value === 'Slate for Admissions' || value === 'Campus Cafe' || value === 'ADP' || value === 'Salesforce Nonprofit Cloud' || originalValue === 'Slate for Admissions') {
      console.log(`renderValueCell: value="${value}" type="${type}" isEmpty=${isEmpty} isChanged=${isChanged} isNewValue=${isNewValue}`);
    }
    
    let formattedValue: string;
    
    // Simplified logic - just format the value as is, don't try to be too clever about "unchanged" status
    if (isEmpty) {
      formattedValue = 'Not set';
    } else {
      formattedValue = formatValue(value, type, false);
    }
    
    return (
      <div className={`p-3 rounded ${isHighlighted ? (isChanged ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200') : 'bg-muted/30'}`}>
        <span className={`text-sm ${
          isEmpty && isChanged ? 'text-gray-500 italic' : 
          isChanged && isHighlighted ? 'text-green-800 font-medium' : 
          isEmpty ? 'text-gray-500 italic' : 
          'text-gray-900 dark:text-gray-100'
        }`}>
          {formattedValue}
        </span>
      </div>
    );
  };

  const renderComparisonSection = (title: string, icon: React.ReactNode, fields: any[]) => {
    if (!fields || fields.length === 0) return null;
    
    // Debug Software Systems specifically
    if (title === 'Software Systems') {
      console.log('=== SOFTWARE SYSTEMS RENDERING DEBUG ===');
      console.log('Fields to render:', fields);
      console.log('originalData:', data.originalData);
      console.log('updatedData:', data.updatedData);
      fields.forEach(field => {
        const currentValue = data.originalData?.[field.key];
        const newValue = data.updatedData?.[field.key];
        console.log(`Field ${field.key}: current="${currentValue}" new="${newValue}"`);
      });
    }
    
    const hasChanges = fields.some(field => {
      const currentValue = data.originalData?.[field.key];
      const newValue = data.updatedData?.[field.key];
      return currentValue !== newValue;
    });

    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
            {hasChanges && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800">
                {fields.filter(field => {
                  const currentValue = data.originalData?.[field.key];
                  const newValue = data.updatedData?.[field.key];
                  return currentValue !== newValue;
                }).length} changes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header Row */}
            <div className="grid grid-cols-3 gap-4 pb-2 border-b">
              <div className="text-sm font-medium text-muted-foreground">Field</div>
              <div className="text-sm font-medium text-muted-foreground">Current Value</div>
              <div className="text-sm font-medium text-muted-foreground">New Value</div>
            </div>
            
            {/* Data Rows */}
            {fields.map((field) => {
              const currentValue = data.originalData?.[field.key];
              const newValue = data.updatedData?.[field.key];
              
              // Debug logging for software fields
              if (title === 'Software Systems') {
                console.log(`Field ${field.key}: currentValue="${currentValue}" newValue="${newValue}"`);
              }
              
              // Simple comparison - if values are different, it's a change
              const isChanged = currentValue !== newValue;
              
               return (
                 <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                   <div className="text-sm font-medium">{field.label}</div>
                   {renderValueCell(currentValue, field.type, false, isChanged, false)}
                   {renderValueCell(newValue, field.type, true, isChanged, true, currentValue)}
                 </div>
               );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Organization fields
  const organizationFields = [
    { key: 'name', label: 'Organization Name', type: 'text' },
    { key: 'primary_contact_first_name', label: 'Primary Contact First Name', type: 'text' },
    { key: 'primary_contact_last_name', label: 'Primary Contact Last Name', type: 'text' },
    { key: 'address_line_1', label: 'Address Line 1', type: 'text' },
    { key: 'address_line_2', label: 'Address Line 2', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'zip_code', label: 'ZIP Code', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'student_fte', label: 'Student FTE', type: 'number' },
    { key: 'primary_contact_title', label: 'Primary Contact Title', type: 'text' },
    { key: 'secondary_first_name', label: 'Secondary First Name', type: 'text' },
    { key: 'secondary_last_name', label: 'Secondary Last Name', type: 'text' },
    { key: 'secondary_contact_title', label: 'Secondary Contact Title', type: 'text' },
    { key: 'secondary_contact_email', label: 'Secondary Contact Email', type: 'text' },
  ];

  // Software system fields
  const softwareFields = [
    { key: 'student_information_system', label: 'Student Information System', type: 'text' },
    { key: 'financial_system', label: 'Financial System', type: 'text' },
    { key: 'financial_aid', label: 'Financial Aid System', type: 'text' },
    { key: 'hcm_hr', label: 'HCM/HR System', type: 'text' },
    { key: 'payroll_system', label: 'Payroll System', type: 'text' },
    { key: 'purchasing_system', label: 'Purchasing System', type: 'text' },
    { key: 'housing_management', label: 'Housing Management System', type: 'text' },
    { key: 'learning_management', label: 'Learning Management System', type: 'text' },
    { key: 'admissions_crm', label: 'Admissions CRM', type: 'text' },
    { key: 'alumni_advancement_crm', label: 'Alumni/Advancement CRM', type: 'text' },
    { key: 'payment_platform', label: 'Payment Platform', type: 'text' },
    { key: 'meal_plan_management', label: 'Meal Plan Management', type: 'text' },
    { key: 'identity_management', label: 'Identity Management', type: 'text' },
    { key: 'door_access', label: 'Door Access System', type: 'text' },
    { key: 'document_management', label: 'Document Management', type: 'text' },
  ];

  // Hardware fields
  const hardwareFields = [
    { key: 'voip', label: 'VoIP', type: 'text' },
    { key: 'network_infrastructure', label: 'Network Infrastructure', type: 'text' },
    { key: 'primary_office_apple', label: 'Apple Products', type: 'boolean' },
    { key: 'primary_office_lenovo', label: 'Lenovo Products', type: 'boolean' },
    { key: 'primary_office_dell', label: 'Dell Products', type: 'boolean' },
    { key: 'primary_office_hp', label: 'HP Products', type: 'boolean' },
    { key: 'primary_office_microsoft', label: 'Microsoft Products', type: 'boolean' },
    { key: 'primary_office_other', label: 'Other Hardware', type: 'boolean' },
    { key: 'primary_office_other_details', label: 'Other Hardware Details', type: 'text' },
    { key: 'other_software_comments', label: 'Software Comments', type: 'text' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" aria-describedby="comparison-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div id="comparison-description" className="sr-only">
          Side-by-side comparison of organization data changes for review and approval
        </div>

        <div className="space-y-6">
          {/* Contact Email Change - Special Section */}
          {data.contactChanges && data.contactChanges.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4" />
                  Primary Contact Change
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800">
                    Critical Change
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-sm font-medium">Primary Contact Email</div>
                  <div className="p-3 rounded bg-red-50 border border-red-200">
                    <span className="text-sm text-red-800">
                      {data.contactChanges[0]?.oldValue || 'Not set'}
                    </span>
                  </div>
                  <div className="p-3 rounded bg-green-50 border border-green-200">
                    <span className="text-sm text-green-800 font-medium">
                      {data.contactChanges[0]?.newValue || 'Not set'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organization Details */}
          {renderComparisonSection(
            'Organization Details',
            <Building2 className="h-4 w-4" />,
            organizationFields
          )}

          {/* Software Systems */}
          {renderComparisonSection(
            'Software Systems',
            <Monitor className="h-4 w-4" />,
            softwareFields
          )}

          {/* Hardware Preferences */}
          {renderComparisonSection(
            'Hardware Preferences',
            <Monitor className="h-4 w-4" />,
            hardwareFields
          )}

          {children}
        </div>

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
      </DialogContent>
    </Dialog>
  );
}