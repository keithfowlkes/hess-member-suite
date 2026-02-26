import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  DollarSign,
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
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Organization {
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
  primary_office_apple?: boolean;
  primary_office_lenovo?: boolean;
  primary_office_dell?: boolean;
  primary_office_hp?: boolean;
  primary_office_microsoft?: boolean;
  primary_office_other?: boolean;
  primary_office_other_details?: string;
  other_software_comments?: string;
  show_systems_to_members?: boolean;
  partner_program_interest?: string[];
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

interface MemberOrganizationDetailsModalProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberOrganizationDetailsModal({ organization, isOpen, onClose }: MemberOrganizationDetailsModalProps) {
  const { user, isAdmin } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setIsPrivileged(false);
        setCheckingAccess(false);
        return;
      }

      // All authenticated users have access
      setHasAccess(true);

      // Admins are always privileged (can always see systems)
      if (isAdmin) {
        setIsPrivileged(true);
        setCheckingAccess(false);
        return;
      }

      // Check if user has board_member role (also privileged)
      try {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const hasBoardMemberRole = roles?.some(r => r.role === 'board_member');
        setIsPrivileged(hasBoardMemberRole || false);
      } catch (error) {
        console.error('Error checking board member role:', error);
        setIsPrivileged(false);
      }
      
      setCheckingAccess(false);
    };

    if (isOpen) {
      checkAccess();
    }
  }, [user, isAdmin, isOpen]);

  if (!organization) return null;

  const profile = organization.profiles;

  // Hardware items
  const hardwareItems = [
    { key: 'primary_office_apple', label: 'Apple', value: organization.primary_office_apple },
    { key: 'primary_office_lenovo', label: 'Lenovo', value: organization.primary_office_lenovo },
    { key: 'primary_office_dell', label: 'Dell', value: organization.primary_office_dell },
    { key: 'primary_office_hp', label: 'HP', value: organization.primary_office_hp },
    { key: 'primary_office_microsoft', label: 'Microsoft', value: organization.primary_office_microsoft },
    { key: 'primary_office_other', label: 'Other', value: organization.primary_office_other },
  ];

  const selectedHardware = hardwareItems.filter(item => item.value);

  // System fields
  const systemFields = [
    { key: 'student_information_system', label: 'Student Information System', icon: Database, value: organization.student_information_system },
    { key: 'financial_system', label: 'Financial System', icon: DollarSign, value: organization.financial_system },
    { key: 'financial_aid', label: 'Financial Aid', icon: CreditCard, value: organization.financial_aid },
    { key: 'hcm_hr', label: 'HCM/HR', icon: UserCheck, value: organization.hcm_hr },
    { key: 'payroll_system', label: 'Payroll System', icon: CreditCard, value: organization.payroll_system },
    { key: 'purchasing_system', label: 'Purchasing System', icon: ShoppingCart, value: organization.purchasing_system },
    { key: 'housing_management', label: 'Housing Management', icon: Home, value: organization.housing_management },
    { key: 'learning_management', label: 'Learning Management', icon: GraduationCap, value: organization.learning_management },
    { key: 'admissions_crm', label: 'Admissions CRM', icon: UserPlus, value: organization.admissions_crm },
    { key: 'alumni_advancement_crm', label: 'Alumni/Advancement CRM', icon: Award, value: organization.alumni_advancement_crm },
    { key: 'payment_platform', label: 'Payment Platform', icon: CreditCard, value: organization.payment_platform },
    { key: 'meal_plan_management', label: 'Meal Plan Management', icon: Users, value: organization.meal_plan_management },
    { key: 'identity_management', label: 'Identity Management', icon: User, value: organization.identity_management },
    { key: 'door_access', label: 'Door Access', icon: Lock, value: organization.door_access },
    { key: 'document_management', label: 'Document Management', icon: Database, value: organization.document_management },
    { key: 'voip', label: 'VoIP', icon: Phone, value: organization.voip },
    { key: 'network_infrastructure', label: 'Network Infrastructure', icon: Monitor, value: organization.network_infrastructure },
  ];
  // Admins/board members always see systems; members only if org allows it
  const showSystemsTabs = isPrivileged || organization.show_systems_to_members !== false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {organization.name}
            <Badge variant={organization.membership_status === 'active' ? 'default' : 'secondary'}>
              {organization.membership_status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {checkingAccess ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !hasAccess ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              You must be logged in to view organization details.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="overview" className="w-full h-full">
              <TabsList className={`grid w-full ${showSystemsTabs ? 'grid-cols-4' : 'grid-cols-2'}`}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                {showSystemsTabs && <TabsTrigger value="systems">Systems</TabsTrigger>}
                {showSystemsTabs && <TabsTrigger value="hardware">Hardware</TabsTrigger>}
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
                        <p className="text-sm font-medium">{organization.name}</p>
                      </div>
                      
                      {organization.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`} 
                             target="_blank" rel="noopener noreferrer" 
                             className="text-sm text-primary hover:underline">
                            {organization.website}
                          </a>
                        </div>
                      )}

                      {organization.student_fte && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{organization.student_fte.toLocaleString()} Student FTE</span>
                        </div>
                      )}

                      {organization.annual_fee_amount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">${organization.annual_fee_amount.toLocaleString()} Annual Fee</span>
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
                      {organization.address_line_1 && <p className="text-sm">{organization.address_line_1}</p>}
                      {organization.address_line_2 && <p className="text-sm">{organization.address_line_2}</p>}
                      {(organization.city || organization.state || organization.zip_code) && (
                        <p className="text-sm">
                          {[organization.city, organization.state, organization.zip_code].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {organization.country && <p className="text-sm">{organization.country}</p>}
                    </CardContent>
                  </Card>
                </div>

                {organization.partner_program_interest && organization.partner_program_interest.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Partner Program Interests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {organization.partner_program_interest.map((interest, index) => (
                          <Badge key={index} variant="secondary" className="text-sm">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {organization.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{organization.notes}</p>
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
                      {(profile?.first_name || profile?.last_name) && (
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <p className="text-sm">{profile.first_name} {profile.last_name}</p>
                        </div>
                      )}
                      {profile?.primary_contact_title && (
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <p className="text-sm">{profile.primary_contact_title}</p>
                        </div>
                      )}
                      {profile?.email && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            Email
                          </Label>
                          <a href={`mailto:${profile.email}`} className="text-sm text-primary hover:underline block">
                            {profile.email}
                          </a>
                        </div>
                      )}
                      {profile?.phone && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            Phone
                          </Label>
                          <p className="text-sm">{profile.phone}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Secondary Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(profile?.secondary_first_name || profile?.secondary_last_name) ? (
                        <>
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <p className="text-sm">{profile.secondary_first_name} {profile.secondary_last_name}</p>
                          </div>
                          {profile?.secondary_contact_title && (
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <p className="text-sm">{profile.secondary_contact_title}</p>
                            </div>
                          )}
                          {profile?.secondary_contact_email && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                Email
                              </Label>
                              <a href={`mailto:${profile.secondary_contact_email}`} className="text-sm text-primary hover:underline block">
                                {profile.secondary_contact_email}
                              </a>
                            </div>
                          )}
                          {profile?.secondary_contact_phone && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                Phone
                              </Label>
                              <p className="text-sm">{profile.secondary_contact_phone}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No secondary contact information available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {showSystemsTabs && (
                <TabsContent value="systems" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Software Systems
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {systemFields.map((field) => {
                          const IconComponent = field.icon;
                          return (
                            <div key={field.key} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                              <IconComponent className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                                <p className="text-sm font-medium truncate">
                                  {field.value || '—'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {organization.other_software_comments && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/30">
                          <Label className="text-xs text-muted-foreground">Other Software Comments</Label>
                          <p className="text-sm mt-1">{organization.other_software_comments}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {showSystemsTabs && (
                <TabsContent value="hardware" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Primary Office Hardware
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedHardware.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedHardware.map(item => (
                            <Badge key={item.key} variant="secondary" className="text-sm">
                              {item.label}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No hardware information available</p>
                      )}
                      
                      {organization.primary_office_other && organization.primary_office_other_details && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/30">
                          <Label className="text-xs text-muted-foreground">Other Hardware Details</Label>
                          <p className="text-sm mt-1">{organization.primary_office_other_details}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
