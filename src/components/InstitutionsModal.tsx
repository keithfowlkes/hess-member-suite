import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Mail, Building2, MoreVertical, Trash2 } from 'lucide-react';
import { useInstitutionsBySystem } from '@/hooks/useInstitutionsBySystem';
import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useMembers';

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
  const { isViewingAsAdmin } = useAuth();
  const { deleteOrganization } = useMembers();

  const handleDelete = async (institutionId: string, institutionName: string) => {
    if (confirm(`Are you sure you want to delete "${institutionName}"? This action cannot be undone.`)) {
      try {
        await deleteOrganization(institutionId);
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
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
        
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : institutions && institutions.length > 0 ? (
            <div className="h-full flex flex-col">
              <div className="text-sm text-muted-foreground mb-3 flex-shrink-0">
                {institutions.length} institution{institutions.length !== 1 ? 's' : ''} found
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                 {institutions.map((institution) => (
                   <div 
                     key={institution.id} 
                     className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                   >
                     <div className="flex-1 min-w-0">
                       <h3 className="font-medium text-foreground truncate">
                         {institution.name}
                       </h3>
                       
                       <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                         {(institution.city || institution.state) && (
                           <div className="flex items-center gap-1">
                             <MapPin className="h-3 w-3 flex-shrink-0" />
                             <span className="truncate">
                               {[institution.city, institution.state].filter(Boolean).join(', ')}
                             </span>
                           </div>
                         )}
                         
                         {institution.email && (
                           <div className="flex items-center gap-1 min-w-0">
                             <Mail className="h-3 w-3 flex-shrink-0" />
                             <span className="truncate" title={institution.email}>
                               {institution.email}
                             </span>
                           </div>
                         )}
                       </div>
                     </div>
                     
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                           <MoreVertical className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         {institution.email && (
                           <DropdownMenuItem asChild>
                             <a 
                               href={`mailto:${institution.email}`}
                               className="flex items-center gap-2"
                             >
                               <Mail className="h-4 w-4" />
                               Send Email
                             </a>
                           </DropdownMenuItem>
                         )}
                         {institution.website && (
                           <DropdownMenuItem asChild>
                             <a
                               href={institution.website.startsWith('http') 
                                 ? institution.website 
                                 : `https://${institution.website}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="flex items-center gap-2"
                             >
                               <ExternalLink className="h-4 w-4" />
                               Visit Website
                             </a>
                           </DropdownMenuItem>
                         )}
                         {isViewingAsAdmin && (
                           <>
                             {(institution.email || institution.website) && (
                               <DropdownMenuSeparator />
                             )}
                             <DropdownMenuItem 
                               onClick={() => handleDelete(institution.id, institution.name)}
                               className="text-destructive focus:text-destructive"
                             >
                               <Trash2 className="h-4 w-4 mr-2" />
                               Delete Institution
                             </DropdownMenuItem>
                           </>
                         )}
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                 ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No institutions found for this system.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}