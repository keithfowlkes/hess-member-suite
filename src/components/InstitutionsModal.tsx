import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, MapPin, Mail, Building2 } from 'lucide-react';
import { useInstitutionsBySystem } from '@/hooks/useInstitutionsBySystem';

interface InstitutionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemField: string | null;
  systemName: string | null;
  systemDisplayName: string | null;
}

export function InstitutionsModal({
  open,
  onOpenChange,
  systemField,
  systemName,
  systemDisplayName
}: InstitutionsModalProps) {
  const { data: institutions, isLoading } = useInstitutionsBySystem(systemField, systemName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Institutions using {systemName}
            {systemDisplayName && (
              <Badge variant="secondary" className="ml-2">
                {systemDisplayName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : institutions && institutions.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-4">
                {institutions.length} institution{institutions.length !== 1 ? 's' : ''} found
              </div>
              
              <div className="grid gap-3">
                {institutions.map((institution) => (
                  <Card key={institution.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <h3 className="font-semibold text-foreground">
                            {institution.name}
                          </h3>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {(institution.city || institution.state) && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {[institution.city, institution.state].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                            
                            {institution.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <a 
                                  href={`mailto:${institution.email}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {institution.email}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {institution.website && (
                          <a
                            href={institution.website.startsWith('http') 
                              ? institution.website 
                              : `https://${institution.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Visit
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No institutions found for this system.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}