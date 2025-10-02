import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Edit, Save, X } from 'lucide-react';
import { UnifiedProfile } from '@/hooks/useUnifiedProfile';
import { useSimpleFieldOptions, type SystemField } from '@/hooks/useSimpleSystemFieldOptions';
import { EnhancedSystemFieldSelect } from '@/components/EnhancedSystemFieldSelect';
import { MemberCohortSelector } from '@/components/MemberCohortSelector';
import { useAuth } from '@/hooks/useAuth';

interface UnifiedProfileEditorProps {
  data: UnifiedProfile;
  canEditDirectly: boolean;
  onSave: (updates: {
    profile?: Partial<UnifiedProfile['profile']>;
    organization?: Partial<UnifiedProfile['organization']>;
  }) => Promise<boolean>;
  saving?: boolean;
}

export const UnifiedProfileEditor: React.FC<UnifiedProfileEditorProps> = ({
  data,
  canEditDirectly,
  onSave,
  saving = false
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize editedData
  const initializeEditedData = (data: UnifiedProfile): UnifiedProfile => {
    return { ...data };
  };
  
  const [editedData, setEditedData] = useState<UnifiedProfile>(initializeEditedData(data));
  
  // Update editedData when data prop changes
  useEffect(() => {
    setEditedData(initializeEditedData(data));
  }, [data]);

  // System field select component
  const SystemFieldSelect = ({ 
    fieldName, 
    label, 
    value, 
    onChange, 
    disabled 
  }: {
    fieldName: SystemField;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
  }) => {
    const options = useSimpleFieldOptions(fieldName);
    
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <Select 
          value={value || "none"} 
          onValueChange={(val) => onChange(val === "none" ? "" : val)} 
          disabled={disabled}
        >
          <SelectTrigger className="bg-background border-input">
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto bg-background border border-input shadow-lg z-[9999]">
            <SelectItem value="none" className="hover:bg-accent">
              <span className="text-muted-foreground">None specified</span>
            </SelectItem>
            {options.map((option) => (
              <SelectItem key={option} value={option} className="hover:bg-accent">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const handleSave = async () => {
    const profileUpdates: Partial<UnifiedProfile['profile']> = {};
    const organizationUpdates: Partial<UnifiedProfile['organization']> = {};
    
    console.log('🚀 handleSave - Original data:', data);
    console.log('🚀 handleSave - Edited data:', editedData);
    
    // Fields that should NOT be updated in profiles table (they belong to organizations)
    const excludedProfileFields = ['address', 'city', 'state', 'zip', 'state_association'];
    
    // Compare profile data
    Object.keys(editedData.profile).forEach(key => {
      // Skip address-related fields that don't exist in profiles table
      if (excludedProfileFields.includes(key)) {
        return;
      }
      
      const typedKey = key as keyof UnifiedProfile['profile'];
      const originalValue = data.profile[typedKey];
      const editedValue = editedData.profile[typedKey];
      
      if (editedValue !== originalValue) {
        console.log(`🚀 Profile change detected - ${key}: "${originalValue}" -> "${editedValue}"`);
        (profileUpdates as any)[typedKey] = editedValue;
      }
    });

    // Compare organization data if it exists
    if (editedData.organization && data.organization) {
      Object.keys(editedData.organization).forEach(key => {
        const typedKey = key as keyof UnifiedProfile['organization'];
        const originalValue = data.organization![typedKey];
        const editedValue = editedData.organization![typedKey];
        
        if (editedValue !== originalValue) {
          console.log(`🚀 Organization change detected - ${key}: "${originalValue}" -> "${editedValue}"`);
          (organizationUpdates as any)[typedKey] = editedValue;
        }
      });
    }

    console.log('🚀 handleSave - Profile updates:', profileUpdates);
    console.log('🚀 handleSave - Organization updates:', organizationUpdates);

    const success = await onSave({
      profile: Object.keys(profileUpdates).length > 0 ? profileUpdates : undefined,
      organization: Object.keys(organizationUpdates).length > 0 ? organizationUpdates : undefined
    });

    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedData(initializeEditedData(data));
    setIsEditing(false);
  };

  const updateProfileField = (field: keyof UnifiedProfile['profile'], value: any) => {
    setEditedData({
      ...editedData,
      profile: {
        ...editedData.profile,
        [field]: value
      }
    });
  };

  const updateOrganizationField = (field: keyof UnifiedProfile['organization'], value: any) => {
    if (!editedData.organization) return;
    setEditedData({
      ...editedData,
      organization: {
        ...editedData.organization,
        [field]: value
      }
    });
  };

  // Handler for address fields in organization
  const updateAddressField = (field: 'address' | 'city' | 'state' | 'zip', value: any) => {
    if (!editedData.organization) return;
    
    const orgFieldMap = {
      address: 'address_line_1',
      city: 'city',
      state: 'state', 
      zip: 'zip_code'
    };
    
    const orgField = orgFieldMap[field];
    setEditedData(prev => ({
      ...prev,
      organization: prev.organization ? {
        ...prev.organization,
        [orgField]: value
      } : prev.organization
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Management</h1>
          <p className="text-muted-foreground mt-2">
            {canEditDirectly 
              ? "Manage profile and organization information" 
              : "Submit changes for admin approval"}
          </p>
          {!canEditDirectly && (
            <p className="text-sm text-amber-600 mt-1">
              Changes will be sent to administrators for review and approval
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {canEditDirectly ? 'Save Changes' : 'Submit for Approval'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Organization Information - Only show if user has an organization */}
      {editedData.organization && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="org_name">Organization Name</Label>
                   <Input
                     id="org_name"
                     value={editedData.organization.name || ''}
                     onChange={(e) => updateOrganizationField('name', e.target.value)}
                     disabled={!isEditing}
                   />
                 </div>
                 <div>
                   <Label htmlFor="student_fte">Student FTE</Label>
                   <Input
                     id="student_fte"
                     type="number"
                     value={editedData.organization.student_fte || ''}
                     onChange={(e) => updateOrganizationField('student_fte', parseInt(e.target.value) || null)}
                     disabled={!isEditing}
                   />
                 </div>
                 <div>
                   <Label htmlFor="org_website">Website</Label>
                   <Input
                     id="org_website"
                     value={editedData.organization.website || ''}
                     onChange={(e) => updateOrganizationField('website', e.target.value)}
                     disabled={!isEditing}
                   />
                 </div>
                 <div>
                   <Label htmlFor="org_date_joined">Approximate Date Joined HESS</Label>
                   <Input
                     id="org_date_joined"
                     type="date"
                     value={editedData.organization.approximate_date_joined_hess || ''}
                     onChange={(e) => updateOrganizationField('approximate_date_joined_hess', e.target.value)}
                     disabled={!isEditing}
                   />
                 </div>
               </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={editedData.organization?.address_line_1 || ''}
                onChange={(e) => updateAddressField('address', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={editedData.organization?.city || ''}
                onChange={(e) => updateAddressField('city', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={editedData.organization?.state || ''}
                onChange={(e) => updateAddressField('state', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={editedData.organization?.zip_code || ''}
                onChange={(e) => updateAddressField('zip', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="state_association">State Association</Label>
              <Input
                id="state_association"
                value={editedData.profile.state_association || ''}
                onChange={(e) => updateProfileField('state_association', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={editedData.profile.first_name || ''}
                onChange={(e) => updateProfileField('first_name', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={editedData.profile.last_name || ''}
                onChange={(e) => updateProfileField('last_name', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={editedData.profile.email || ''}
                onChange={(e) => updateProfileField('email', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editedData.profile.phone || ''}
                onChange={(e) => updateProfileField('phone', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="primary_contact_title">Title</Label>
              <Input
                id="primary_contact_title"
                value={editedData.profile.primary_contact_title || ''}
                onChange={(e) => updateProfileField('primary_contact_title', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Secondary Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="secondary_first_name">First Name</Label>
              <Input
                id="secondary_first_name"
                value={editedData.profile.secondary_first_name || ''}
                onChange={(e) => updateProfileField('secondary_first_name', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="secondary_last_name">Last Name</Label>
              <Input
                id="secondary_last_name"
                value={editedData.profile.secondary_last_name || ''}
                onChange={(e) => updateProfileField('secondary_last_name', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="secondary_contact_title">Title</Label>
              <Input
                id="secondary_contact_title"
                value={editedData.profile.secondary_contact_title || ''}
                onChange={(e) => updateProfileField('secondary_contact_title', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="secondary_contact_email">Email</Label>
              <Input
                id="secondary_contact_email"
                value={editedData.profile.secondary_contact_email || ''}
                onChange={(e) => updateProfileField('secondary_contact_email', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="secondary_contact_phone">Phone</Label>
              <Input
                id="secondary_contact_phone"
                value={editedData.profile.secondary_contact_phone || ''}
                onChange={(e) => updateProfileField('secondary_contact_phone', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Memberships */}
      <MemberCohortSelector 
        userId={user?.id}
        disabled={!isEditing}
        title="Professional Cohort Memberships"
        description="Join cohort groups to connect with peers using the same software systems"
      />

      {/* Software Systems */}
      <Card>
        <CardHeader>
          <CardTitle>Software Systems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnhancedSystemFieldSelect
              fieldName="student_information_system"
              label="Student Information System"
              value={editedData.profile.student_information_system || ''}
              onChange={(value) => updateProfileField('student_information_system', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="financial_system"
              label="Financial System"
              value={editedData.profile.financial_system || ''}
              onChange={(value) => updateProfileField('financial_system', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="financial_aid"
              label="Financial Aid"
              value={editedData.profile.financial_aid || ''}
              onChange={(value) => updateProfileField('financial_aid', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="hcm_hr"
              label="HCM/HR"
              value={editedData.profile.hcm_hr || ''}
              onChange={(value) => updateProfileField('hcm_hr', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="payroll_system"
              label="Payroll System"
              value={editedData.profile.payroll_system || ''}
              onChange={(value) => updateProfileField('payroll_system', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="purchasing_system"
              label="Purchasing System"
              value={editedData.profile.purchasing_system || ''}
              onChange={(value) => updateProfileField('purchasing_system', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="housing_management"
              label="Housing Management"
              value={editedData.profile.housing_management || ''}
              onChange={(value) => updateProfileField('housing_management', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="learning_management"
              label="Learning Management"
              value={editedData.profile.learning_management || ''}
              onChange={(value) => updateProfileField('learning_management', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="admissions_crm"
              label="Admissions CRM"
              value={editedData.profile.admissions_crm || ''}
              onChange={(value) => updateProfileField('admissions_crm', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="alumni_advancement_crm"
              label="Alumni/Advancement CRM"
              value={editedData.profile.alumni_advancement_crm || ''}
              onChange={(value) => updateProfileField('alumni_advancement_crm', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="payment_platform"
              label="Payment Platform"
              value={editedData.profile.payment_platform || ''}
              onChange={(value) => updateProfileField('payment_platform', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="meal_plan_management"
              label="Meal Plan Management"
              value={editedData.profile.meal_plan_management || ''}
              onChange={(value) => updateProfileField('meal_plan_management', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="identity_management"
              label="Identity Management"
              value={editedData.profile.identity_management || ''}
              onChange={(value) => updateProfileField('identity_management', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="door_access"
              label="Door Access"
              value={editedData.profile.door_access || ''}
              onChange={(value) => updateProfileField('door_access', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="document_management"
              label="Document Management"
              value={editedData.profile.document_management || ''}
              onChange={(value) => updateProfileField('document_management', value)}
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hardware Systems */}
      <Card>
        <CardHeader>
          <CardTitle>Hardware Systems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnhancedSystemFieldSelect
              fieldName="voip"
              label="VoIP"
              value={editedData.profile.voip || ''}
              onChange={(value) => updateProfileField('voip', value)}
              disabled={!isEditing}
            />
            <EnhancedSystemFieldSelect
              fieldName="network_infrastructure"
              label="Network Infrastructure"
              value={editedData.profile.network_infrastructure || ''}
              onChange={(value) => updateProfileField('network_infrastructure', value)}
              disabled={!isEditing}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Label>Primary Office Hardware</Label>
              <div className="space-y-2">
                {[
                  { key: 'primary_office_apple', label: 'Apple' },
                  { key: 'primary_office_lenovo', label: 'Lenovo' },
                  { key: 'primary_office_dell', label: 'Dell' },
                  { key: 'primary_office_hp', label: 'HP' },
                  { key: 'primary_office_microsoft', label: 'Microsoft' },
                  { key: 'primary_office_other', label: 'Other' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={editedData.profile[key as keyof UnifiedProfile['profile']] as boolean || false}
                      onCheckedChange={(checked) => updateProfileField(key as keyof UnifiedProfile['profile'], checked)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor={key}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="primary_office_other_details">Other Hardware Details</Label>
              <Textarea
                id="primary_office_other_details"
                value={editedData.profile.primary_office_other_details || ''}
                onChange={(e) => updateProfileField('primary_office_other_details', e.target.value)}
                disabled={!isEditing}
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="other_software_comments">Other Software Comments</Label>
            <Textarea
              id="other_software_comments"
              value={editedData.profile.other_software_comments || ''}
              onChange={(e) => updateProfileField('other_software_comments', e.target.value)}
              disabled={!isEditing}
              rows={4}
              placeholder="Please describe any other software systems or tools you use..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};