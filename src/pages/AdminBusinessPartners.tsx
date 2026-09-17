import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Building2, ExternalLink, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { PartnerAdminDialog } from '@/components/partners/PartnerAdminDialog';
import { PartnershipLevelsDialog } from '@/components/partners/PartnershipLevelsDialog';
import { PartnerLevelBadge } from '@/components/partners/PartnerLevelBadge';
import {
  BusinessPartner,
  useAllBusinessPartners,
  useDeleteBusinessPartner,
  useSaveBusinessPartner,
} from '@/hooks/useBusinessPartners';
import { useAuth } from '@/hooks/useAuth';

export default function AdminBusinessPartners() {
  const { isAdmin } = useAuth();
  const { data: partners = [], isLoading } = useAllBusinessPartners();
  const savePartner = useSaveBusinessPartner();
  const deletePartner = useDeleteBusinessPartner();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessPartner | null>(null);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (partner: BusinessPartner) => {
    setEditing(partner);
    setDialogOpen(true);
  };

  const togglePublished = (partner: BusinessPartner) => {
    savePartner.mutate({
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      is_published: !partner.is_published,
    } as any);
  };

  if (!isAdmin) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 p-8">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                This area is available to administrators only.
              </CardContent>
            </Card>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-6 lg:p-8">
          <div className="container mx-auto max-w-6xl space-y-6">
            <div className="flex items-start justify-between border-b border-border pb-4 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Business Partners</h1>
                <p className="text-muted-foreground mt-2">
                  Create and manage vendor partner microsites, contacts, documents and member offers.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to="/partners" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View directory
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setLevelsOpen(true)}>
                  <Award className="h-4 w-4 mr-2" />
                  Partnership levels
                </Button>
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  New partner
                </Button>
              </div>
            </div>

            {isLoading ? (
              <Card className="h-40 animate-pulse bg-muted/50" />
            ) : partners.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <p className="text-muted-foreground">No business partners have been added yet.</p>
                  <Button onClick={openNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first partner
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {partners.map((partner) => (
                  <Card key={partner.id}>
                    <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                      <div className="h-14 w-24 shrink-0 rounded border border-border bg-card flex items-center justify-center overflow-hidden">
                        {partner.logo_url ? (
                          <img src={partner.logo_url} alt="" className="max-h-12 max-w-[85%] object-contain" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            className="font-semibold text-foreground hover:text-primary transition-colors"
                            onClick={() => openEdit(partner)}
                          >
                            {partner.name}
                          </button>
                          <Badge variant={partner.is_published ? 'default' : 'secondary'}>
                            {partner.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          {partner.is_featured && (
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                          <PartnerLevelBadge levelId={partner.partnership_level_id} size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          /partners/{partner.slug}
                          {partner.short_description ? ` · ${partner.short_description}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => togglePublished(partner)}>
                          {partner.is_published ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Publish
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(partner)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete partner</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove "{partner.name}" along with its contacts and documents? This cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deletePartner.mutate(partner.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {dialogOpen && (
        <PartnerAdminDialog
          key={editing?.id ?? 'new-partner'}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          partner={editing}
        />
      )}
      <PartnershipLevelsDialog open={levelsOpen} onOpenChange={setLevelsOpen} />
    </SidebarProvider>
  );
}
