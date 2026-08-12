import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Mail, Building2, MoreVertical, Trash2, Download } from 'lucide-react';
import { useInstitutionsBySystem } from '@/hooks/useInstitutionsBySystem';
import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useMembers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { isViewingAsAdmin, isAdmin, user } = useAuth();
  const { deleteOrganization } = useMembers();
  const [canExport, setCanExport] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    const checkRole = async () => {
      if (!user) {
        if (active) setCanExport(false);
        return;
      }
      if (isAdmin) {
        if (active) setCanExport(true);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'cohort_leader')
        .limit(1);
      if (active) setCanExport(!!data && data.length > 0);
    };
    checkRole();
    return () => { active = false; };
  }, [user, isAdmin]);

  const handleDelete = async (institutionId: string, institutionName: string) => {
    if (confirm(`Are you sure you want to delete "${institutionName}"? This action cannot be undone.`)) {
      try {
        await deleteOrganization(institutionId);
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleExportCsv = async () => {
    if (!institutions || institutions.length === 0) return;
    setExporting(true);
    try {
      const ids = institutions.map((i) => i.id);
      const rows: any[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, address_line_1, address_line_2, city, state, zip_code, phone, email, website, primary_contact_title, secondary_first_name, secondary_last_name, secondary_contact_title, secondary_contact_email, secondary_contact_phone, contact_person_id, profiles:contact_person_id (first_name, last_name, email, phone)')
          .in('id', ids.slice(i, i + 200));
        if (error) throw error;
        rows.push(...(data || []));
      }

      const byId = new Map(rows.map((r) => [r.id, r]));
      const headers = [
        'Institution', 'System', 'Address 1', 'Address 2', 'City', 'State', 'Zip',
        'Institution Phone', 'Institution Email', 'Website',
        'Primary Contact Name', 'Primary Contact Title', 'Primary Contact Email', 'Primary Contact Phone',
        'Secondary Contact Name', 'Secondary Contact Title', 'Secondary Contact Email', 'Secondary Contact Phone',
      ];

      const escape = (value: any) => {
        const str = value === null || value === undefined ? '' : String(value);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const lines = [headers.join(',')];
      institutions.forEach((inst) => {
        const org: any = byId.get(inst.id) || {};
        const primary = org.profiles || null;
        const primaryName = primary ? [primary.first_name, primary.last_name].filter(Boolean).join(' ') : '';
        const secondaryName = [org.secondary_first_name, org.secondary_last_name].filter(Boolean).join(' ');
        lines.push([
          inst.name,
          inst.systemName || systemName || '',
          org.address_line_1, org.address_line_2, org.city, org.state, org.zip_code,
          org.phone, org.email, org.website,
          primaryName, org.primary_contact_title, primary?.email, primary?.phone,
          secondaryName, org.secondary_contact_title, org.secondary_contact_email, org.secondary_contact_phone,
        ].map(escape).join(','));
      });

      const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `institutions-${(systemName || 'system').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${institutions.length} institutions`);
    } catch (error: any) {
      console.error('CSV export failed:', error);
      toast.error(error?.message || 'Failed to export institutions');
    } finally {
      setExporting(false);
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">
                            {institution.name}
                          </h3>
                          {institution.systemName && systemName === 'Other' && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {institution.systemName}
                            </Badge>
                          )}
                        </div>
                        
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