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
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    organization?: string;
    state_association?: string;
    student_fte?: number;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    primary_contact_title?: string;
    secondary_first_name?: string;
    secondary_last_name?: string;
    secondary_contact_title?: string;
    secondary_contact_email?: string;
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
    primary_office_apple?: boolean;
    primary_office_asus?: boolean;
    primary_office_dell?: boolean;
    primary_office_hp?: boolean;
    primary_office_microsoft?: boolean;
    primary_office_other?: boolean;
    primary_office_other_details?: string;
    other_software_comments?: string;
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

  if (!organization) return null;

  const handleEdit = () => {
    setEditData({ ...organization });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editData) return;
    
    try {
      // Extract only organization fields that can be updated
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
      };
      
      await updateOrganization(editData.id, orgUpdateData);
      setIsEditing(false);
      setEditData(null);
      onClose();
    } catch (error) {
      // Error is handled in the hook
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

                    {profile?.student_fte && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profile.student_fte.toLocaleString()} Student FTE</span>
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
                      <div>
                        <Label>Name</Label>
                        <p className="text-sm">{profile.first_name} {profile.last_name}</p>
                      </div>
                    )}
                    {profile?.primary_contact_title && (
                      <div>
                        <Label>Title</Label>
                        <p className="text-sm">{profile.primary_contact_title}</p>
                      </div>
                    )}
                    {profile?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${profile.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {profile.email}
                        </a>
                      </div>
                    )}
                    {profile?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profile.phone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(profile?.secondary_first_name || profile?.secondary_contact_email) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Secondary Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {profile.secondary_first_name && (
                        <div>
                          <Label>Name</Label>
                          <p className="text-sm">{profile.secondary_first_name} {profile.secondary_last_name}</p>
                        </div>
                      )}
                      {profile.secondary_contact_title && (
                        <div>
                          <Label>Title</Label>
                          <p className="text-sm">{profile.secondary_contact_title}</p>
                        </div>
                      )}
                      {profile.secondary_contact_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${profile.secondary_contact_email}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {profile.secondary_contact_email}
                          </a>
                        </div>
                      )}
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
                ].map(({ key, label, icon: Icon }) => {
                  const value = profile?.[key as keyof typeof profile] as string;
                  if (!value) return null;
                  
                  return (
                    <Card key={key}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-sm text-muted-foreground">{value}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {profile?.other_software_comments && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Software Comments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{profile.other_software_comments}</p>
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
                      { key: 'primary_office_asus', label: 'Lenovo' },
                      { key: 'primary_office_dell', label: 'Dell' },
                      { key: 'primary_office_hp', label: 'HP' },
                      { key: 'primary_office_microsoft', label: 'Microsoft' },
                      { key: 'primary_office_other', label: 'Other' },
                    ].map(({ key, label }) => {
                      const isSelected = profile?.[key as keyof typeof profile] as boolean;
                      return (
                        <div key={key} className="flex items-center space-x-2">
                          <Switch checked={isSelected} disabled />
                          <span className="text-sm">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {profile?.primary_office_other_details && (
                    <div className="mt-4">
                      <Label>Other Hardware Details</Label>
                      <p className="text-sm text-muted-foreground mt-1">{profile.primary_office_other_details}</p>
                    </div>
                  )}
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