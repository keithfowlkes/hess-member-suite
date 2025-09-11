import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Mail, MapPin, Users } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  city?: string;
  state?: string;
  email?: string;
  student_fte?: number;
  membership_status?: string;
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
                <span>{contactEmail}</span>
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