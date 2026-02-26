import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, User, Mail, MapPin, Users, Database, Monitor, DollarSign, CreditCard, UserCheck, ShoppingCart, Home, GraduationCap, UserPlus, Award, Phone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Organization {
  id: string;
  name: string;
  city?: string;
  state?: string;
  email?: string;
  student_fte?: number;
  membership_status?: string;
  show_systems_to_members?: boolean;
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
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    student_fte?: number;
  };
}

interface OrganizationInfoModalProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrganizationInfoModal({ organization, isOpen, onClose }: OrganizationInfoModalProps) {
  if (!organization) return null;

  const primaryContactName = organization.profiles 
    ? `${organization.profiles.first_name || ''} ${organization.profiles.last_name || ''}`.trim()
    : '';
  
  const contactEmail = organization.profiles?.email || organization.email;
  const studentFTE = organization.profiles?.student_fte || organization.student_fte;
  const location = [organization.city, organization.state].filter(Boolean).join(', ');
  const showSystems = organization.show_systems_to_members !== false;

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
    { key: 'door_access', label: 'Door Access', icon: Building2, value: organization.door_access },
    { key: 'document_management', label: 'Document Management', icon: Database, value: organization.document_management },
    { key: 'voip', label: 'VoIP', icon: Phone, value: organization.voip },
    { key: 'network_infrastructure', label: 'Network Infrastructure', icon: Monitor, value: organization.network_infrastructure },
  ];

  const hardwareItems = [
    { key: 'primary_office_apple', label: 'Apple', value: organization.primary_office_apple },
    { key: 'primary_office_lenovo', label: 'Lenovo', value: organization.primary_office_lenovo },
    { key: 'primary_office_dell', label: 'Dell', value: organization.primary_office_dell },
    { key: 'primary_office_hp', label: 'HP', value: organization.primary_office_hp },
    { key: 'primary_office_microsoft', label: 'Microsoft', value: organization.primary_office_microsoft },
    { key: 'primary_office_other', label: 'Other', value: organization.primary_office_other },
  ];
  const selectedHardware = hardwareItems.filter(item => item.value);

  // Simple view without systems
  if (!showSystems) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Organization Information</DialogTitle>
          </DialogHeader>
          
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                {organization.name}
              </CardTitle>
              {organization.membership_status && (
                <Badge 
                  variant={organization.membership_status === 'active' ? 'default' : 'secondary'}
                  className="w-fit"
                >
                  {organization.membership_status}
                </Badge>
              )}
            </CardHeader>
            
            <CardContent className="space-y-3">
              {primaryContactName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground text-xs">Primary Contact</div>
                    <div className="font-medium">{primaryContactName}</div>
                  </div>
                </div>
              )}
              
              {contactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contactEmail}`} className="hover:underline">
                    {contactEmail}
                  </a>
                </div>
              )}
              
              {location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{location}</span>
                </div>
              )}
              
              {studentFTE !== undefined && studentFTE !== null && (
                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Student FTE:</span>
                  <span className="font-medium">{studentFTE.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  // Expanded view with systems/hardware tabs
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {organization.name}
            {organization.membership_status && (
              <Badge 
                variant={organization.membership_status === 'active' ? 'default' : 'secondary'}
              >
                {organization.membership_status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="systems">Systems</TabsTrigger>
              <TabsTrigger value="hardware">Hardware</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {primaryContactName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground text-xs">Primary Contact</div>
                        <div className="font-medium">{primaryContactName}</div>
                      </div>
                    </div>
                  )}
                  
                  {contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${contactEmail}`} className="hover:underline">
                        {contactEmail}
                      </a>
                    </div>
                  )}
                  
                  {location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{location}</span>
                    </div>
                  )}
                  
                  {studentFTE !== undefined && studentFTE !== null && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Student FTE:</span>
                      <span className="font-medium">{studentFTE.toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
