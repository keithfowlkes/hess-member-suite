import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useOrganizationProfile, OrganizationProfile } from '@/hooks/useOrganizationProfile';
import { useSimpleFieldOptions, type SystemField } from '@/hooks/useSimpleSystemFieldOptions';
import { Loader2, Edit, Save, X, ArrowLeft, Building2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const OrganizationProfilePage = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
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
  const { data, loading, updateOrganizationProfile, getUserOrganization } = useOrganizationProfile(profileId);
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [editedData, setEditedData] = useState<OrganizationProfile | null>(null);

  useEffect(() => {
    const initializePermissions = async () => {
      if (data && user) {
        await checkEditPermissions();
        setEditedData(data);
      }
    };
    
    initializePermissions();
  }, [data, user]);

  const checkEditPermissions = async () => {
    if (!data || !user) return;

    // Admin can edit any organization
    if (isAdmin) {
      setCanEdit(true);
      return;
    }

    // Primary contact can edit their organization
    if (data.profile.user_id === user.id) {
      setCanEdit(true);
      return;
    }

    // Check if user belongs to the same organization
    try {
      const userOrganization = await getUserOrganization(user.id);
      if (userOrganization && userOrganization.id === data.organization.id) {
        setCanEdit(true);
        return;
      }
    } catch (error) {
      console.error('Error checking user organization:', error);
    }

    setCanEdit(false);
  };

  const handleSave = async () => {
    if (!editedData || !data) return;

    setSaving(true);
    
    const success = await updateOrganizationProfile({
      organization: editedData.organization,
      profile: editedData.profile
    });

    if (success) {
      setIsEditing(false);
    }
    
    setSaving(false);
  };

  const handleCancel = () => {
    setEditedData(data);
    setIsEditing(false);
  };

  const updateOrganizationField = (field: keyof OrganizationProfile['organization'], value: any) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      organization: {
        ...editedData.organization,
        [field]: value
      }
    });
  };

  const updateProfileField = (field: keyof OrganizationProfile['profile'], value: any) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      profile: {
        ...editedData.profile,
        [field]: value
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'expired': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'cancelled': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!data) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Organization Not Found</h1>
              <p className="text-muted-foreground">Unable to load the requested organization information.</p>
              <Button 
                onClick={() => navigate('/members')} 
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Members
              </Button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <Button 
                    onClick={() => navigate('/members')} 
                    variant="outline"
                    size="sm"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Members
                  </Button>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      {data.organization.name}
                    </h1>
                    <Badge className={`mt-1 ${getStatusColor(data.organization.membership_status)}`}>
                      {data.organization.membership_status}
                    </Badge>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  {canEdit 
                    ? "Manage organization and contact information" 
                    : "View organization and contact information"}
                </p>
              </div>
              
              {canEdit && (
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
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Information
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      value={editedData?.organization.name || ''}
                      onChange={(e) => updateOrganizationField('name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="membership_status">Membership Status</Label>
                    <Select
                      value={editedData?.organization.membership_status || 'pending'}
                      onValueChange={(value) => updateOrganizationField('membership_status', value)}
                      disabled={!isEditing || !isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="email">Organization Email</Label>
                    <Input
                      id="email"
                      value={editedData?.organization.email || ''}
                      onChange={(e) => updateOrganizationField('email', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Organization Phone</Label>
                    <Input
                      id="phone"
                      value={editedData?.organization.phone || ''}
                      onChange={(e) => updateOrganizationField('phone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={editedData?.organization.website || ''}
                      onChange={(e) => updateOrganizationField('website', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="student_fte">Student FTE</Label>
                    <Input
                      id="student_fte"
                      type="number"
                      value={editedData?.organization.student_fte || ''}
                      onChange={(e) => updateOrganizationField('student_fte', parseInt(e.target.value) || null)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="annual_fee_amount">Annual Fee Amount</Label>
                    <Input
                      id="annual_fee_amount"
                      type="number"
                      step="0.01"
                      value={editedData?.organization.annual_fee_amount || ''}
                      onChange={(e) => updateOrganizationField('annual_fee_amount', parseFloat(e.target.value) || 0)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address_line_1">Address Line 1</Label>
                    <Input
                      id="address_line_1"
                      value={editedData?.organization.address_line_1 || ''}
                      onChange={(e) => updateOrganizationField('address_line_1', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address_line_2">Address Line 2</Label>
                    <Input
                      id="address_line_2"
                      value={editedData?.organization.address_line_2 || ''}
                      onChange={(e) => updateOrganizationField('address_line_2', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={editedData?.organization.city || ''}
                        onChange={(e) => updateOrganizationField('city', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={editedData?.organization.state || ''}
                        onChange={(e) => updateOrganizationField('state', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip_code">ZIP Code</Label>
                      <Input
                        id="zip_code"
                        value={editedData?.organization.zip_code || ''}
                        onChange={(e) => updateOrganizationField('zip_code', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editedData?.organization.notes || ''}
                    onChange={(e) => updateOrganizationField('notes', e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Primary Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Primary Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={editedData?.profile.first_name || ''}
                      onChange={(e) => updateProfileField('first_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={editedData?.profile.last_name || ''}
                      onChange={(e) => updateProfileField('last_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_email">Email</Label>
                    <Input
                      id="contact_email"
                      value={editedData?.profile.email || ''}
                      onChange={(e) => updateProfileField('email', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Phone</Label>
                    <Input
                      id="contact_phone"
                      value={editedData?.profile.phone || ''}
                      onChange={(e) => updateProfileField('phone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="primary_contact_title">Title</Label>
                    <Input
                      id="primary_contact_title"
                      value={editedData?.organization.primary_contact_title || ''}
                      onChange={(e) => updateOrganizationField('primary_contact_title', e.target.value)}
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
                      value={editedData?.organization.secondary_first_name || ''}
                      onChange={(e) => updateOrganizationField('secondary_first_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary_last_name">Last Name</Label>
                    <Input
                      id="secondary_last_name"
                      value={editedData?.organization.secondary_last_name || ''}
                      onChange={(e) => updateOrganizationField('secondary_last_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary_contact_title">Title</Label>
                    <Input
                      id="secondary_contact_title"
                      value={editedData?.organization.secondary_contact_title || ''}
                      onChange={(e) => updateOrganizationField('secondary_contact_title', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary_contact_email">Email</Label>
                    <Input
                      id="secondary_contact_email"
                      value={editedData?.organization.secondary_contact_email || ''}
                      onChange={(e) => updateOrganizationField('secondary_contact_email', e.target.value)}
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
                    value={editedData?.organization.student_information_system || ''}
                    onChange={(value) => updateOrganizationField('student_information_system', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="financial_system"
                    label="Financial System"
                    value={editedData?.organization.financial_system || ''}
                    onChange={(value) => updateOrganizationField('financial_system', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="financial_aid"
                    label="Financial Aid System"
                    value={editedData?.organization.financial_aid || ''}
                    onChange={(value) => updateOrganizationField('financial_aid', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="hcm_hr"
                    label="Human Capital Management"
                    value={editedData?.organization.hcm_hr || ''}
                    onChange={(value) => updateOrganizationField('hcm_hr', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="payroll_system"
                    label="Payroll System"
                    value={editedData?.organization.payroll_system || ''}
                    onChange={(value) => updateOrganizationField('payroll_system', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="purchasing_system"
                    label="Purchasing System"
                    value={editedData?.organization.purchasing_system || ''}
                    onChange={(value) => updateOrganizationField('purchasing_system', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="housing_management"
                    label="Housing Management System"
                    value={editedData?.organization.housing_management || ''}
                    onChange={(value) => updateOrganizationField('housing_management', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="learning_management"
                    label="Learning Management System"
                    value={editedData?.organization.learning_management || ''}
                    onChange={(value) => updateOrganizationField('learning_management', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="admissions_crm"
                    label="Admissions CRM"
                    value={editedData?.organization.admissions_crm || ''}
                    onChange={(value) => updateOrganizationField('admissions_crm', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="alumni_advancement_crm"
                    label="Alumni/Advancement CRM"
                    value={editedData?.organization.alumni_advancement_crm || ''}
                    onChange={(value) => updateOrganizationField('alumni_advancement_crm', value)}
                    disabled={!isEditing}
                  />
                </div>

                {/* Primary Office Software */}
                <div>
                  <Label className="text-base font-semibold">Primary Office Software</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
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
                          checked={editedData?.organization[key as keyof OrganizationProfile['organization']] as boolean || false}
                          onCheckedChange={(checked) => updateOrganizationField(key as keyof OrganizationProfile['organization'], checked)}
                          disabled={!isEditing}
                        />
                        <Label htmlFor={key}>{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {editedData?.organization.primary_office_other && (
                  <div>
                    <Label htmlFor="primary_office_other_details">Other Software Details</Label>
                    <Input
                      id="primary_office_other_details"
                      value={editedData?.organization.primary_office_other_details || ''}
                      onChange={(e) => updateOrganizationField('primary_office_other_details', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="other_software_comments">Other Software Comments</Label>
                  <Textarea
                    id="other_software_comments"
                    value={editedData?.organization.other_software_comments || ''}
                    onChange={(e) => updateOrganizationField('other_software_comments', e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default OrganizationProfilePage;