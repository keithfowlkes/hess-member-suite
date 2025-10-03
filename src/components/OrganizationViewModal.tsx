import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type SystemField } from '@/hooks/useSimpleSystemFieldOptions';
import { EnhancedSystemFieldSelect } from '@/components/EnhancedSystemFieldSelect';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  DollarSign,
  Edit3,
  Save,
  X,
  Users,
  Monitor,
  Database,
  CreditCard,
  UserCheck,
  ShoppingCart,
  Home,
  GraduationCap,
  UserPlus,
  Award,
  Trash2,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { useMembers, Organization } from '@/hooks/useMembers';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { OrganizationCRMTab } from '@/components/OrganizationCRMTab';

interface OrganizationViewModalProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrganizationViewModal({ organization, isOpen, onClose }: OrganizationViewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Organization | null>(null);
  const { updateOrganization, deleteOrganization } = useMembers();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  if (!organization) return null;

  // Check if current user can edit this organization (admin only)
  const canEdit = isAdmin;

  const handleEdit = () => {
    setEditData({ ...organization });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editData) return;
    
    try {
      const orgUpdateData = {
        name: editData.name,
        address_line_1: editData.address_line_1,
        address_line_2: editData.address_line_2,
        city: editData.city,
        state: editData.state,
        zip_code: editData.zip_code,
        country: editData.country,
        phone: editData.phone,
        email: editData.email,
        website: editData.website,
        membership_status: editData.membership_status,
        membership_start_date: editData.membership_start_date,
        membership_end_date: editData.membership_end_date,
        annual_fee_amount: editData.annual_fee_amount,
        notes: editData.notes,
        student_fte: editData.student_fte,
        // Include contact fields
        primary_contact_title: editData.profiles?.primary_contact_title,
        secondary_first_name: editData.profiles?.secondary_first_name,
        secondary_last_name: editData.profiles?.secondary_last_name,
        secondary_contact_title: editData.profiles?.secondary_contact_title,
        secondary_contact_email: editData.profiles?.secondary_contact_email,
        secondary_contact_phone: editData.profiles?.secondary_contact_phone,
        // Include systems and hardware fields from organization
        student_information_system: editData.student_information_system,
        financial_system: editData.financial_system,
        financial_aid: editData.financial_aid,
        hcm_hr: editData.hcm_hr,
        payroll_system: editData.payroll_system,
        purchasing_system: editData.purchasing_system,
        housing_management: editData.housing_management,
        learning_management: editData.learning_management,
        admissions_crm: editData.admissions_crm,
        alumni_advancement_crm: editData.alumni_advancement_crm,
        payment_platform: editData.payment_platform,
        meal_plan_management: editData.meal_plan_management,
        identity_management: editData.identity_management,
        door_access: editData.door_access,
        document_management: editData.document_management,
        voip: editData.voip,
        network_infrastructure: editData.network_infrastructure,
        primary_office_apple: editData.primary_office_apple,
        primary_office_lenovo: editData.primary_office_lenovo,
        primary_office_dell: editData.primary_office_dell,
        primary_office_hp: editData.primary_office_hp,
        primary_office_microsoft: editData.primary_office_microsoft,
        primary_office_other: editData.primary_office_other,
        primary_office_other_details: editData.primary_office_other_details,
        other_software_comments: editData.other_software_comments,
      };
      
      await updateOrganization(editData.id, orgUpdateData);
      setIsEditing(false);
      setEditData(null);
      toast({
        title: "Organization Updated",
        description: "Organization information has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    
    try {
      await deleteOrganization(organization.id);
      onClose();
      toast({
        title: "Organization Deleted",
        description: "Organization has been removed from membership.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const currentData = isEditing ? editData : organization;
  if (!currentData) return null;

  const profile = currentData.profiles;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'expired': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'cancelled': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {currentData.name}
              <Badge className={getStatusColor(currentData.membership_status)}>
                {currentData.membership_status}
              </Badge>
            </DialogTitle>
            {canEdit && (
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-1" />
                      Save Changes
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={handleEdit}>
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="systems">Systems</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="crm">CRM</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organization Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Organization Name</Label>
                    {isEditing ? (
                      <Input
                        value={currentData.name}
                        onChange={(e) => setEditData({...editData!, name: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm font-medium">{currentData.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Membership Status</Label>
                    {isEditing ? (
                      <Select
                        value={currentData.membership_status}
                        onValueChange={(value: any) => setEditData({...editData!, membership_status: value})}
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
                    ) : (
                      <Badge className={getStatusColor(currentData.membership_status)}>
                        {currentData.membership_status}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input
                        value={currentData.website || ''}
                        onChange={(e) => setEditData({...editData!, website: e.target.value})}
                        placeholder="https://example.com"
                      />
                    ) : currentData.website ? (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={currentData.website} target="_blank" rel="noopener noreferrer" 
                           className="text-sm text-primary hover:underline">
                          {currentData.website}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Student FTE</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={currentData.student_fte || ''}
                        onChange={(e) => setEditData({...editData!, student_fte: e.target.value ? parseInt(e.target.value) : undefined})}
                      />
                    ) : currentData.student_fte ? (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{currentData.student_fte.toLocaleString()} Students</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Annual Fee</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={currentData.annual_fee_amount || ''}
                        onChange={(e) => setEditData({...editData!, annual_fee_amount: e.target.value ? parseFloat(e.target.value) : undefined})}
                      />
                    ) : currentData.annual_fee_amount ? (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">${currentData.annual_fee_amount.toLocaleString()}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not set</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Address Line 1</Label>
                    {isEditing ? (
                      <Input
                        value={currentData.address_line_1 || ''}
                        onChange={(e) => setEditData({...editData!, address_line_1: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm">{currentData.address_line_1 || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>City, State, ZIP</Label>
                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={currentData.city || ''}
                          onChange={(e) => setEditData({...editData!, city: e.target.value})}
                          placeholder="City"
                        />
                        <Input
                          value={currentData.state || ''}
                          onChange={(e) => setEditData({...editData!, state: e.target.value})}
                          placeholder="State"
                        />
                        <Input
                          value={currentData.zip_code || ''}
                          onChange={(e) => setEditData({...editData!, zip_code: e.target.value})}
                          placeholder="ZIP"
                        />
                      </div>
                    ) : (
                      <p className="text-sm">
                        {[currentData.city, currentData.state, currentData.zip_code].filter(Boolean).join(', ') || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        value={currentData.phone || ''}
                        onChange={(e) => setEditData({...editData!, phone: e.target.value})}
                        placeholder="(555) 123-4567"
                      />
                    ) : currentData.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{currentData.phone}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={currentData.email || ''}
                        onChange={(e) => setEditData({...editData!, email: e.target.value})}
                        placeholder="contact@organization.edu"
                      />
                    ) : currentData.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${currentData.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {currentData.email}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {(currentData.notes || isEditing) && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={currentData.notes || ''}
                      onChange={(e) => setEditData({...editData!, notes: e.target.value})}
                      rows={3}
                      placeholder="Add any additional notes about this organization..."
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{currentData.notes || 'No notes available'}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Primary Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile?.first_name || isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <p className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Title</Label>
                        {isEditing ? (
                          <Input
                            value={profile?.primary_contact_title || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, primary_contact_title: e.target.value }
                            })}
                            placeholder="Primary Contact Title"
                          />
                        ) : (
                          <p className="text-sm">{profile?.primary_contact_title || 'Not provided'}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${profile?.email}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {profile?.email}
                          </a>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{profile?.phone || 'Not provided'}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No primary contact information available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Secondary Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    {isEditing ? (
                      <Input
                        value={profile?.secondary_first_name || ''}
                        onChange={(e) => setEditData({
                          ...editData!,
                          profiles: { ...editData!.profiles!, secondary_first_name: e.target.value }
                        })}
                        placeholder="Secondary Contact First Name"
                      />
                    ) : (
                      <p className="text-sm">{profile?.secondary_first_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    {isEditing ? (
                      <Input
                        value={profile?.secondary_last_name || ''}
                        onChange={(e) => setEditData({
                          ...editData!,
                          profiles: { ...editData!.profiles!, secondary_last_name: e.target.value }
                        })}
                        placeholder="Secondary Contact Last Name"
                      />
                    ) : (
                      <p className="text-sm">{profile?.secondary_last_name || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Title</Label>
                    {isEditing ? (
                      <Input
                        value={profile?.secondary_contact_title || ''}
                        onChange={(e) => setEditData({
                          ...editData!,
                          profiles: { ...editData!.profiles!, secondary_contact_title: e.target.value }
                        })}
                        placeholder="Secondary Contact Title"
                      />
                    ) : (
                      <p className="text-sm">{profile?.secondary_contact_title || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={profile?.secondary_contact_email || ''}
                        onChange={(e) => setEditData({
                          ...editData!,
                          profiles: { ...editData!.profiles!, secondary_contact_email: e.target.value }
                        })}
                        placeholder="secondary@organization.edu"
                      />
                    ) : profile?.secondary_contact_email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${profile.secondary_contact_email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {profile.secondary_contact_email}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="systems" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'student_information_system', label: 'Student Information System', icon: Database },
                { key: 'financial_system', label: 'Financial System', icon: DollarSign },
                { key: 'financial_aid', label: 'Financial Aid', icon: CreditCard },
                { key: 'hcm_hr', label: 'HCM/HR', icon: UserCheck },
                { key: 'payroll_system', label: 'Payroll System', icon: DollarSign },
                { key: 'purchasing_system', label: 'Purchasing System', icon: ShoppingCart },
                { key: 'housing_management', label: 'Housing Management', icon: Home },
                { key: 'learning_management', label: 'Learning Management', icon: GraduationCap },
                { key: 'admissions_crm', label: 'Admissions CRM', icon: UserPlus },
                { key: 'alumni_advancement_crm', label: 'Alumni/Advancement CRM', icon: Award },
                { key: 'payment_platform', label: 'Payment Platform', icon: CreditCard },
                { key: 'meal_plan_management', label: 'Meal Plan Management', icon: Database },
                { key: 'identity_management', label: 'Identity Management', icon: UserCheck },
                { key: 'door_access', label: 'Door Access', icon: Home },
                { key: 'document_management', label: 'Document Management', icon: Database },
              ].map(({ key, label, icon: Icon }) => {
                const value = currentData[key as keyof typeof currentData] as string;
                
                return (
                  <Card key={key}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">{label}</Label>
                        </div>
                        {isEditing ? (
                          <EnhancedSystemFieldSelect
                            fieldName={key as SystemField}
                            label={label}
                            value={value || ''}
                            onChange={(newValue) => setEditData({
                              ...editData!,
                              [key]: newValue
                            })}
                            organizationId={organization.id}
                            disabled={false}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground ml-6">{value || 'Not specified'}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Additional Software Comments</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={currentData.other_software_comments || ''}
                    onChange={(e) => setEditData({
                      ...editData!,
                      other_software_comments: e.target.value
                    })}
                    rows={3}
                    placeholder="Add any additional software comments..."
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{currentData.other_software_comments || 'No additional comments'}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hardware" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Network & Communications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>VoIP</Label>
                  {isEditing ? (
                    <EnhancedSystemFieldSelect
                      fieldName="voip"
                      label="VoIP"
                      value={currentData.voip || ''}
                      onChange={(newValue) => setEditData({
                        ...editData!,
                        voip: newValue
                      })}
                      organizationId={organization.id}
                      disabled={false}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{currentData.voip || 'Not specified'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Network Infrastructure</Label>
                  {isEditing ? (
                    <EnhancedSystemFieldSelect
                      fieldName="network_infrastructure"
                      label="Network Infrastructure"
                      value={currentData.network_infrastructure || ''}
                      onChange={(newValue) => setEditData({
                        ...editData!,
                        network_infrastructure: newValue
                      })}
                      organizationId={organization.id}
                      disabled={false}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{currentData.network_infrastructure || 'Not specified'}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Primary Office Hardware
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { key: 'primary_office_apple', label: 'Apple' },
                    { key: 'primary_office_lenovo', label: 'Lenovo' },
                    { key: 'primary_office_dell', label: 'Dell' },
                    { key: 'primary_office_hp', label: 'HP' },
                    { key: 'primary_office_microsoft', label: 'Microsoft' },
                    { key: 'primary_office_other', label: 'Other' },
                  ].map(({ key, label }) => {
                    const isSelected = currentData[key as keyof typeof currentData] as boolean;
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        {isEditing ? (
                          <Switch
                            checked={isSelected || false}
                            onCheckedChange={(checked) => setEditData({
                              ...editData!,
                              [key]: checked
                            })}
                          />
                        ) : (
                          <div className={`w-3 h-3 rounded border ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                        )}
                        <span className="text-sm">{label}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 space-y-2">
                  <Label>Other Hardware Details</Label>
                  {isEditing ? (
                    <Textarea
                      value={currentData.primary_office_other_details || ''}
                      onChange={(e) => setEditData({
                        ...editData!,
                        primary_office_other_details: e.target.value
                      })}
                      rows={2}
                      placeholder="Specify other hardware details..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{currentData.primary_office_other_details || 'No additional details'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="crm" className="space-y-4">
            <OrganizationCRMTab 
              organizationId={currentData.id} 
              organizationName={currentData.name}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}