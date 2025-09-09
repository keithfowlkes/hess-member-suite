import React, { useState } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<UnifiedProfile>(data);

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
    console.log('🚀 UnifiedProfileEditor: Save button clicked');
    
    const profileUpdates: Partial<UnifiedProfile['profile']> = {};
    const organizationUpdates: Partial<UnifiedProfile['organization']> = {};
    
    // Compare profile data
    Object.keys(editedData.profile).forEach(key => {
      const typedKey = key as keyof UnifiedProfile['profile'];
      if (editedData.profile[typedKey] !== data.profile[typedKey]) {
        (profileUpdates as any)[typedKey] = editedData.profile[typedKey];
      }
    });

    // Compare organization data if it exists
    if (editedData.organization && data.organization) {
      Object.keys(editedData.organization).forEach(key => {
        const typedKey = key as keyof UnifiedProfile['organization'];
        if (editedData.organization![typedKey] !== data.organization![typedKey]) {
          (organizationUpdates as any)[typedKey] = editedData.organization![typedKey];
        }
      });
    }

    console.log('📝 Profile updates:', profileUpdates);
    console.log('🏢 Organization updates:', organizationUpdates);

    const success = await onSave({
      profile: Object.keys(profileUpdates).length > 0 ? profileUpdates : undefined,
      organization: Object.keys(organizationUpdates).length > 0 ? organizationUpdates : undefined
    });

    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedData(data);
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
              </div>
            </CardContent>
          </Card>

          {/* Software Systems */}
          <Card>
            <CardHeader>
              <CardTitle>Software Systems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SystemFieldSelect
                  fieldName="student_information_system"
                  label="Student Information System"
                  value={editedData.organization.student_information_system || ''}
                  onChange={(value) => updateOrganizationField('student_information_system', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="financial_system"
                  label="Financial System"
                  value={editedData.organization.financial_system || ''}
                  onChange={(value) => updateOrganizationField('financial_system', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="financial_aid"
                  label="Financial Aid"
                  value={editedData.organization.financial_aid || ''}
                  onChange={(value) => updateOrganizationField('financial_aid', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="hcm_hr"
                  label="HCM/HR"
                  value={editedData.organization.hcm_hr || ''}
                  onChange={(value) => updateOrganizationField('hcm_hr', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="payroll_system"
                  label="Payroll System"
                  value={editedData.organization.payroll_system || ''}
                  onChange={(value) => updateOrganizationField('payroll_system', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="purchasing_system"
                  label="Purchasing System"
                  value={editedData.organization.purchasing_system || ''}
                  onChange={(value) => updateOrganizationField('purchasing_system', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="housing_management"
                  label="Housing Management"
                  value={editedData.organization.housing_management || ''}
                  onChange={(value) => updateOrganizationField('housing_management', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="learning_management"
                  label="Learning Management"
                  value={editedData.organization.learning_management || ''}
                  onChange={(value) => updateOrganizationField('learning_management', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="admissions_crm"
                  label="Admissions CRM"
                  value={editedData.organization.admissions_crm || ''}
                  onChange={(value) => updateOrganizationField('admissions_crm', value)}
                  disabled={!isEditing}
                />
                <SystemFieldSelect
                  fieldName="alumni_advancement_crm"
                  label="Alumni/Advancement CRM"
                  value={editedData.organization.alumni_advancement_crm || ''}
                  onChange={(value) => updateOrganizationField('alumni_advancement_crm', value)}
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
                <div className="space-y-4">
                  <Label>Primary Office Hardware</Label>
                  <div className="space-y-2">
                    {[
                      { key: 'primary_office_apple', label: 'Apple' },
                      { key: 'primary_office_asus', label: 'ASUS' },
                      { key: 'primary_office_dell', label: 'Dell' },
                      { key: 'primary_office_hp', label: 'HP' },
                      { key: 'primary_office_microsoft', label: 'Microsoft' },
                      { key: 'primary_office_other', label: 'Other' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={editedData.organization?.[key as keyof UnifiedProfile['organization']] as boolean || false}
                          onCheckedChange={(checked) => updateOrganizationField(key as keyof UnifiedProfile['organization'], checked)}
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
                    value={editedData.organization.primary_office_other_details || ''}
                    onChange={(e) => updateOrganizationField('primary_office_other_details', e.target.value)}
                    disabled={!isEditing}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Software Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="other_software_comments">Other Software Comments</Label>
                <Textarea
                  id="other_software_comments"
                  value={editedData.organization.other_software_comments || ''}
                  onChange={(e) => updateOrganizationField('other_software_comments', e.target.value)}
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Please describe any other software systems or tools your organization uses..."
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
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
                value={editedData.profile.address || ''}
                onChange={(e) => updateProfileField('address', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={editedData.profile.city || ''}
                onChange={(e) => updateProfileField('city', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={editedData.profile.state || ''}
                onChange={(e) => updateProfileField('state', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={editedData.profile.zip || ''}
                onChange={(e) => updateProfileField('zip', e.target.value)}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};