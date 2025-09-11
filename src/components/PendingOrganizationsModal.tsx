import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, MapPin, User, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  email?: string;
  city?: string;
  state?: string;
  student_fte?: number;
  annual_fee_amount?: number;
  membership_status: string;
  membership_start_date?: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    primary_contact_title?: string;
  };
}

interface PendingOrganizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
}

export function PendingOrganizationsModal({ isOpen, onClose, organizations }: PendingOrganizationsModalProps) {
  const pendingOrganizations = organizations.filter(org => org.membership_status === 'pending');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            Pending Organizations ({pendingOrganizations.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {pendingOrganizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No pending organizations found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingOrganizations.map((org) => (
                <Card key={org.id} className="border-amber-200/50 bg-amber-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{org.name}</h3>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 mt-1">
                          {org.membership_status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        {org.annual_fee_amount && (
                          <div className="flex items-center gap-1 text-sm font-medium text-emerald-700">
                            <DollarSign className="h-4 w-4" />
                            ${org.annual_fee_amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Contact Information */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Contact Information
                        </h4>
                        <div className="space-y-1 pl-5">
                          {org.profiles && (
                            <div className="text-sm">
                              <span className="font-medium">
                                {org.profiles.first_name} {org.profiles.last_name}
                              </span>
                              {org.profiles.primary_contact_title && (
                                <span className="text-muted-foreground ml-2">
                                  ({org.profiles.primary_contact_title})
                                </span>
                              )}
                            </div>
                          )}
                          {(org.email || org.profiles?.email) && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {org.email || org.profiles?.email}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Organization Details */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          Organization Details
                        </h4>
                        <div className="space-y-1 pl-5">
                          {(org.city || org.state) && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {[org.city, org.state].filter(Boolean).join(', ')}
                            </div>
                          )}
                          {org.student_fte && (
                            <div className="text-sm text-muted-foreground">
                              Student FTE: {org.student_fte.toLocaleString()}
                            </div>
                          )}
                          {org.membership_start_date && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Start Date: {format(new Date(org.membership_start_date), 'MMM dd, yyyy')}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground">
                            Registered: {format(new Date(org.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}