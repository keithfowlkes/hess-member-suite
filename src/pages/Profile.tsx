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
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Edit, Save, X } from 'lucide-react';

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
      // Check if user is admin - admins can always edit their profile
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();

      if (userRole) {
        setCanEdit(true);
        return;
      }

      // Check organization membership
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      // Check if current user has permission to edit this organization (is a member of it)  
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', currentProfile?.organization_id)
        .single();

      setCanEdit(orgData?.id === currentProfile?.organization_id);
    } catch (error) {
      console.error('Error checking edit permissions:', error);
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
                <h1 className="text-3xl font-bold text-foreground">Organization Profile</h1>
                <p className="text-muted-foreground mt-2">
                  {canEdit 
                    ? "Manage your organization's profile information" 
                    : "View your organization's profile information"}
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
                      Edit Profile
                    </Button>
                  )}
                </div>
              )}
            </div>

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
                  <div>
                    <Label htmlFor="student_information_system">Student Information System</Label>
                    <Input
                      id="student_information_system"
                      value={editedProfile?.student_information_system || ''}
                      onChange={(e) => updateField('student_information_system', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="financial_system">Financial System</Label>
                    <Input
                      id="financial_system"
                      value={editedProfile?.financial_system || ''}
                      onChange={(e) => updateField('financial_system', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="financial_aid">Financial Aid</Label>
                    <Input
                      id="financial_aid"
                      value={editedProfile?.financial_aid || ''}
                      onChange={(e) => updateField('financial_aid', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hcm_hr">HCM/HR System</Label>
                    <Input
                      id="hcm_hr"
                      value={editedProfile?.hcm_hr || ''}
                      onChange={(e) => updateField('hcm_hr', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payroll_system">Payroll System</Label>
                    <Input
                      id="payroll_system"
                      value={editedProfile?.payroll_system || ''}
                      onChange={(e) => updateField('payroll_system', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchasing_system">Purchasing System</Label>
                    <Input
                      id="purchasing_system"
                      value={editedProfile?.purchasing_system || ''}
                      onChange={(e) => updateField('purchasing_system', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="housing_management">Housing Management</Label>
                    <Input
                      id="housing_management"
                      value={editedProfile?.housing_management || ''}
                      onChange={(e) => updateField('housing_management', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="learning_management">Learning Management</Label>
                    <Input
                      id="learning_management"
                      value={editedProfile?.learning_management || ''}
                      onChange={(e) => updateField('learning_management', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admissions_crm">Admissions CRM</Label>
                    <Input
                      id="admissions_crm"
                      value={editedProfile?.admissions_crm || ''}
                      onChange={(e) => updateField('admissions_crm', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="alumni_advancement_crm">Alumni/Advancement CRM</Label>
                    <Input
                      id="alumni_advancement_crm"
                      value={editedProfile?.alumni_advancement_crm || ''}
                      onChange={(e) => updateField('alumni_advancement_crm', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
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