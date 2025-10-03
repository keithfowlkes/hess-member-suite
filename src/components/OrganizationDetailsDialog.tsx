import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Calendar, 
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
  Award
} from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSystemFieldOptions } from '@/hooks/useSystemFieldOptions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PublicOrganization {
  id: string;
  name: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  membership_status: 'active' | 'pending' | 'expired' | 'cancelled';
  membership_start_date?: string;
  membership_end_date?: string;
  annual_fee_amount?: number;
  notes?: string;
  student_fte?: number;
  state_association?: string;
  // System fields
  student_information_system?: string;
  financial_system?: string;
  financial_aid?: string;
  hcm_hr?: string;
  payroll_system?: string;
  purchasing_system?: string;
  housing_management?: string;
  learning_management?: string;
  admissions_crm?: string;
  alumni_advancement_crm?: string;
  payment_platform?: string;
  meal_plan_management?: string;
  identity_management?: string;
  door_access?: string;
  document_management?: string;
  voip?: string;
  network_infrastructure?: string;
  // Hardware fields
  primary_office_apple?: boolean;
  primary_office_lenovo?: boolean;
  primary_office_dell?: boolean;
  primary_office_hp?: boolean;
  primary_office_microsoft?: boolean;
  primary_office_other?: boolean;
  primary_office_other_details?: string;
  other_software_comments?: string;
  // Profile contact info only
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    organization?: string;
    primary_contact_title?: string;
    secondary_first_name?: string;
    secondary_last_name?: string;
    secondary_contact_title?: string;
    secondary_contact_email?: string;
    secondary_contact_phone?: string;
  };
}

interface OrganizationDetailsDialogProps {
  organization: PublicOrganization | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
}

export function OrganizationDetailsDialog({ organization, isOpen, onClose, canEdit = false }: OrganizationDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<PublicOrganization | null>(null);
  const { updateOrganization } = useMembers();
  const { toast } = useToast();
  const { data: systemFieldOptions } = useSystemFieldOptions();

  if (!organization) return null;

  // Get options for a specific field
  const getFieldOptions = (fieldName: string) => {
    return systemFieldOptions
      ?.filter(opt => opt.field_name === fieldName)
      .map(opt => opt.option_value)
      .sort((a, b) => a.localeCompare(b)) || [];
  };

  const handleEdit = () => {
    setEditData({ ...organization });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editData) return;
    
    try {
      // Update organization fields
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
        state_association: editData.state_association,
        // System fields
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
        // Hardware fields
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
      
      // Update profile fields if they exist
      if (editData.profiles && organization?.profiles) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('contact_person_id')
          .eq('id', editData.id)
          .single();
        
        if (orgs?.contact_person_id) {
          await supabase
            .from('profiles')
            .update({
              first_name: editData.profiles.first_name,
              last_name: editData.profiles.last_name,
              email: editData.profiles.email,
              phone: editData.profiles.phone,
              primary_contact_title: editData.profiles.primary_contact_title,
              secondary_first_name: editData.profiles.secondary_first_name,
              secondary_last_name: editData.profiles.secondary_last_name,
              secondary_contact_title: editData.profiles.secondary_contact_title,
              secondary_contact_email: editData.profiles.secondary_contact_email,
              secondary_contact_phone: editData.profiles.secondary_contact_phone,
            })
            .eq('id', orgs.contact_person_id);
        }
      }
      
      toast({
        title: 'Success',
        description: 'Organization and profile updated successfully',
      });
      
      setIsEditing(false);
      setEditData(null);
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update organization',
        variant: 'destructive',
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {currentData.name}
            <Badge variant={currentData.membership_status === 'active' ? 'default' : 'secondary'}>
              {currentData.membership_status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="overview" className="w-full h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="systems">Systems</TabsTrigger>
              <TabsTrigger value="hardware">Hardware</TabsTrigger>
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
                    
                    {currentData.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={currentData.website} target="_blank" rel="noopener noreferrer" 
                           className="text-sm text-primary hover:underline">
                          {currentData.website}
                        </a>
                      </div>
                    )}

                    {currentData.student_fte && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{currentData.student_fte.toLocaleString()} Student FTE</span>
                      </div>
                    )}

                    {currentData.annual_fee_amount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">${currentData.annual_fee_amount.toLocaleString()} Annual Fee</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {currentData.address_line_1 && <p className="text-sm">{currentData.address_line_1}</p>}
                    {currentData.address_line_2 && <p className="text-sm">{currentData.address_line_2}</p>}
                    {(currentData.city || currentData.state || currentData.zip_code) && (
                      <p className="text-sm">
                        {[currentData.city, currentData.state, currentData.zip_code].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {currentData.country && <p className="text-sm">{currentData.country}</p>}
                  </CardContent>
                </Card>
              </div>

              {currentData.notes && (
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
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{currentData.notes}</p>
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
                    {profile?.first_name && (
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        {isEditing ? (
                          <Input
                            value={editData?.profiles?.first_name || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, first_name: e.target.value }
                            })}
                          />
                        ) : (
                          <p className="text-sm">{profile.first_name}</p>
                        )}
                      </div>
                    )}
                    {profile?.last_name && (
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        {isEditing ? (
                          <Input
                            value={editData?.profiles?.last_name || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, last_name: e.target.value }
                            })}
                          />
                        ) : (
                          <p className="text-sm">{profile.last_name}</p>
                        )}
                      </div>
                    )}
                    {profile?.primary_contact_title && (
                      <div className="space-y-2">
                        <Label>Title</Label>
                        {isEditing ? (
                          <Input
                            value={editData?.profiles?.primary_contact_title || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, primary_contact_title: e.target.value }
                            })}
                          />
                        ) : (
                          <p className="text-sm">{profile.primary_contact_title}</p>
                        )}
                      </div>
                    )}
                    {profile?.email && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email
                        </Label>
                        {isEditing ? (
                          <Input
                            type="email"
                            value={editData?.profiles?.email || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, email: e.target.value }
                            })}
                          />
                        ) : (
                          <a 
                            href={`mailto:${profile.email}`}
                            className="text-sm text-primary hover:underline block"
                          >
                            {profile.email}
                          </a>
                        )}
                      </div>
                    )}
                    {profile?.phone && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          Phone
                        </Label>
                        {isEditing ? (
                          <Input
                            type="tel"
                            value={editData?.profiles?.phone || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, phone: e.target.value }
                            })}
                          />
                        ) : (
                          <span className="text-sm">{profile.phone}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(profile?.secondary_first_name || profile?.secondary_contact_email || isEditing) && (
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
                            value={editData?.profiles?.secondary_first_name || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, secondary_first_name: e.target.value }
                            })}
                          />
                        ) : profile?.secondary_first_name ? (
                          <p className="text-sm">{profile.secondary_first_name}</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        {isEditing ? (
                          <Input
                            value={editData?.profiles?.secondary_last_name || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, secondary_last_name: e.target.value }
                            })}
                          />
                        ) : profile?.secondary_last_name ? (
                          <p className="text-sm">{profile.secondary_last_name}</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        {isEditing ? (
                          <Input
                            value={editData?.profiles?.secondary_contact_title || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, secondary_contact_title: e.target.value }
                            })}
                          />
                        ) : profile?.secondary_contact_title ? (
                          <p className="text-sm">{profile.secondary_contact_title}</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email
                        </Label>
                        {isEditing ? (
                          <Input
                            type="email"
                            value={editData?.profiles?.secondary_contact_email || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, secondary_contact_email: e.target.value }
                            })}
                          />
                        ) : profile?.secondary_contact_email ? (
                          <a 
                            href={`mailto:${profile.secondary_contact_email}`}
                            className="text-sm text-primary hover:underline block"
                          >
                            {profile.secondary_contact_email}
                          </a>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          Phone
                        </Label>
                        {isEditing ? (
                          <Input
                            type="tel"
                            value={editData?.profiles?.secondary_contact_phone || ''}
                            onChange={(e) => setEditData({
                              ...editData!,
                              profiles: { ...editData!.profiles!, secondary_contact_phone: e.target.value }
                            })}
                          />
                        ) : profile?.secondary_contact_phone ? (
                          <span className="text-sm">{profile.secondary_contact_phone}</span>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                )}
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
                  { key: 'meal_plan_management', label: 'Meal Plan Management', icon: ShoppingCart },
                  { key: 'identity_management', label: 'Identity Management', icon: UserCheck },
                  { key: 'door_access', label: 'Door Access', icon: Building2 },
                  { key: 'document_management', label: 'Document Management', icon: Database },
                  { key: 'voip', label: 'VoIP', icon: Phone },
                  { key: 'network_infrastructure', label: 'Network Infrastructure', icon: Database },
                ].map(({ key, label, icon: Icon }) => {
                  const value = currentData?.[key as keyof typeof currentData] as string;
                  const fieldOptions = getFieldOptions(key);
                  if (!value && !isEditing) return null;
                  
                  return (
                    <Card key={key}>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {label}
                          </Label>
                          {isEditing ? (
                            <Select
                              value={(editData?.[key as keyof typeof editData] as string) || ''}
                              onValueChange={(newValue) => setEditData({
                                ...editData!,
                                [key]: newValue
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {fieldOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-muted-foreground">{value}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {(organization?.other_software_comments || isEditing) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Software Comments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editData?.other_software_comments || ''}
                        onChange={(e) => setEditData({
                          ...editData!,
                          other_software_comments: e.target.value
                        })}
                        rows={4}
                        placeholder="Enter any additional software comments"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{organization?.other_software_comments}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="hardware" className="space-y-4">
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
                      const isSelected = currentData?.[key as keyof typeof currentData] as boolean;
                      return (
                        <div key={key} className="flex items-center space-x-2">
                          <Switch 
                            checked={isSelected || false} 
                            disabled={!isEditing}
                            onCheckedChange={(checked) => {
                              if (isEditing) {
                                setEditData({
                                  ...editData!,
                                  [key]: checked
                                });
                              }
                            }}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Label>Other Hardware Details</Label>
                    {isEditing ? (
                      <Textarea
                        value={editData?.primary_office_other_details || ''}
                        onChange={(e) => setEditData({
                          ...editData!,
                          primary_office_other_details: e.target.value
                        })}
                        rows={3}
                        placeholder="Enter details about other hardware"
                      />
                    ) : organization?.primary_office_other_details ? (
                      <p className="text-sm text-muted-foreground">{organization.primary_office_other_details}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No additional hardware details</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {canEdit && (
          <div className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}