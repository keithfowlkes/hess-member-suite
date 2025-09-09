import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
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
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Edit, Save, X } from 'lucide-react';
import { useSimpleFieldOptions, type SystemField } from '@/hooks/useSimpleSystemFieldOptions';

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization: string;
  state_association: string;
  student_fte: number | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  primary_contact_title: string;
  secondary_first_name: string;
  secondary_last_name: string;
  secondary_contact_title: string;
  secondary_contact_email: string;
  student_information_system: string;
  financial_system: string;
  financial_aid: string;
  hcm_hr: string;
  payroll_system: string;
  purchasing_system: string;
  housing_management: string;
  learning_management: string;
  admissions_crm: string;
  alumni_advancement_crm: string;
  primary_office_apple: boolean;
  primary_office_asus: boolean;
  primary_office_dell: boolean;
  primary_office_hp: boolean;
  primary_office_microsoft: boolean;
  primary_office_other: boolean;
  primary_office_other_details: string;
  other_software_comments: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [editedProfile, setEditedProfile] = useState<ProfileData | null>(null);

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

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkEditPermissions();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEditPermissions = async () => {
    try {
      // All authenticated users can edit their own profile
      // Admins can edit any profile (handled elsewhere)
      setCanEdit(true);
    } catch (error) {
      console.error('Error checking edit permissions:', error);
      setCanEdit(false);
    }
  };

  const handleSave = async () => {
    if (!editedProfile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editedProfile)
        .eq('user_id', user?.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
        return;
      }

      setProfile(editedProfile);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    if (!editedProfile) return;
    setEditedProfile({
      ...editedProfile,
      [field]: value
    });
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

  if (!profile) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
              <p className="text-muted-foreground">Unable to load your profile information.</p>
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
                <h1 className="text-3xl font-bold text-foreground">User Profile</h1>
                <p className="text-muted-foreground mt-2">
                  {canEdit 
                    ? "Manage your personal profile information" 
                    : "View your personal profile information"}
                </p>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Need to edit organization information for admin approval?</strong>
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = `/organization/${profile?.id}`}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    Go to Organization Profile Editor
                  </Button>
                </div>
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
                      Edit Profile
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organization">Organization Name</Label>
                    <Input
                      id="organization"
                      value={editedProfile?.organization || ''}
                      onChange={(e) => updateField('organization', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state_association">State Association</Label>
                    <Input
                      id="state_association"
                      value={editedProfile?.state_association || ''}
                      onChange={(e) => updateField('state_association', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="student_fte">Student FTE</Label>
                    <Input
                      id="student_fte"
                      type="number"
                      value={editedProfile?.student_fte || ''}
                      onChange={(e) => updateField('student_fte', parseInt(e.target.value) || null)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={editedProfile?.address || ''}
                      onChange={(e) => updateField('address', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={editedProfile?.city || ''}
                      onChange={(e) => updateField('city', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={editedProfile?.state || ''}
                      onChange={(e) => updateField('state', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={editedProfile?.zip || ''}
                      onChange={(e) => updateField('zip', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={editedProfile?.first_name || ''}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={editedProfile?.last_name || ''}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={editedProfile?.email || ''}
                      onChange={(e) => updateField('email', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editedProfile?.phone || ''}
                      onChange={(e) => updateField('phone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="primary_contact_title">Title</Label>
                    <Input
                      id="primary_contact_title"
                      value={editedProfile?.primary_contact_title || ''}
                      onChange={(e) => updateField('primary_contact_title', e.target.value)}
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
                      value={editedProfile?.secondary_first_name || ''}
                      onChange={(e) => updateField('secondary_first_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary_last_name">Last Name</Label>
                    <Input
                      id="secondary_last_name"
                      value={editedProfile?.secondary_last_name || ''}
                      onChange={(e) => updateField('secondary_last_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary_contact_title">Title</Label>
                    <Input
                      id="secondary_contact_title"
                      value={editedProfile?.secondary_contact_title || ''}
                      onChange={(e) => updateField('secondary_contact_title', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondary_contact_email">Email</Label>
                    <Input
                      id="secondary_contact_email"
                      value={editedProfile?.secondary_contact_email || ''}
                      onChange={(e) => updateField('secondary_contact_email', e.target.value)}
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
                    value={editedProfile?.student_information_system || ''}
                    onChange={(value) => updateField('student_information_system', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="financial_system"
                    label="Financial System"
                    value={editedProfile?.financial_system || ''}
                    onChange={(value) => updateField('financial_system', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="financial_aid"
                    label="Financial Aid System"
                    value={editedProfile?.financial_aid || ''}
                    onChange={(value) => updateField('financial_aid', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="hcm_hr"
                    label="Human Capital Management"
                    value={editedProfile?.hcm_hr || ''}
                    onChange={(value) => updateField('hcm_hr', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="payroll_system"
                    label="Payroll System"
                    value={editedProfile?.payroll_system || ''}
                    onChange={(value) => updateField('payroll_system', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="purchasing_system"
                    label="Purchasing System"
                    value={editedProfile?.purchasing_system || ''}
                    onChange={(value) => updateField('purchasing_system', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="housing_management"
                    label="Housing Management System"
                    value={editedProfile?.housing_management || ''}
                    onChange={(value) => updateField('housing_management', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="learning_management"
                    label="Learning Management System"
                    value={editedProfile?.learning_management || ''}
                    onChange={(value) => updateField('learning_management', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="admissions_crm"
                    label="Admissions CRM"
                    value={editedProfile?.admissions_crm || ''}
                    onChange={(value) => updateField('admissions_crm', value)}
                    disabled={!isEditing}
                  />
                  <SystemFieldSelect
                    fieldName="alumni_advancement_crm"
                    label="Alumni/Advancement CRM"
                    value={editedProfile?.alumni_advancement_crm || ''}
                    onChange={(value) => updateField('alumni_advancement_crm', value)}
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Primary Office Vendors */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Office Vendors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { field: 'primary_office_apple', label: 'Apple' },
                    { field: 'primary_office_asus', label: 'ASUS' },
                    { field: 'primary_office_dell', label: 'Dell' },
                    { field: 'primary_office_hp', label: 'HP' },
                    { field: 'primary_office_microsoft', label: 'Microsoft' },
                    { field: 'primary_office_other', label: 'Other' },
                  ].map(({ field, label }) => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={field}
                        checked={editedProfile?.[field as keyof ProfileData] as boolean || false}
                        onCheckedChange={(checked) => updateField(field as keyof ProfileData, checked)}
                        disabled={!isEditing}
                      />
                      <Label htmlFor={field}>{label}</Label>
                    </div>
                  ))}
                </div>
                
                {editedProfile?.primary_office_other && (
                  <div>
                    <Label htmlFor="primary_office_other_details">Other Vendor Details</Label>
                    <Input
                      id="primary_office_other_details"
                      value={editedProfile?.primary_office_other_details || ''}
                      onChange={(e) => updateField('primary_office_other_details', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Please specify other vendors"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="other_software_comments">Other Software Comments</Label>
                  <Textarea
                    id="other_software_comments"
                    value={editedProfile?.other_software_comments || ''}
                    onChange={(e) => updateField('other_software_comments', e.target.value)}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Any additional software or system information..."
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

export default Profile;