import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSurveys, useUpdateSurvey, useDeleteSurvey } from '@/hooks/useSurveys';
import { CreateSurveyDialog } from '@/components/CreateSurveyDialog';
import { SurveyResultsDialog } from '@/components/SurveyResultsDialog';
import { EditSurveyDialog } from '@/components/EditSurveyDialog';
import { RealtimeSurveyCharts } from '@/components/RealtimeSurveyCharts';
import { Plus, FileQuestion, Calendar, MoreVertical, Eye, ToggleLeft, ToggleRight, BarChart3, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminSurveys() {
  const { data: surveys, isLoading } = useSurveys();
  const updateSurvey = useUpdateSurvey();
  const deleteSurvey = useDeleteSurvey();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [realtimeViewSurveyId, setRealtimeViewSurveyId] = useState<string | null>(null);
  const [editSurveyId, setEditSurveyId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<{ id: string; title: string } | null>(null);

  const toggleSurveyStatus = (surveyId: string, currentStatus: boolean) => {
    updateSurvey.mutate({ id: surveyId, is_active: !currentStatus });
  };

  const handleDeleteClick = (survey: { id: string; title: string }) => {
    setSurveyToDelete(survey);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (surveyToDelete) {
      deleteSurvey.mutate(surveyToDelete.id);
      setDeleteDialogOpen(false);
      setSurveyToDelete(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
          {/* Mobile menu button - always visible on mobile */}
          <div className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background p-4 lg:hidden">
            <SidebarTrigger className="h-10 w-10 rounded-md border-2 border-primary bg-primary/10 hover:bg-primary/20" />
            <h1 className="text-lg font-semibold">HESS Consortium</h1>
          </div>
          
          <div className="container mx-auto py-6 px-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Survey Management</h1>
                <p className="text-muted-foreground mt-1">
                  Create and manage member surveys
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Survey
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">Loading surveys...</div>
            ) : !surveys || surveys.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No surveys yet</h3>
                    <p className="text-muted-foreground max-w-md mb-4">
                      Get started by creating your first survey for members
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Survey
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {surveys.map((survey) => (
                  <Card key={survey.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={survey.is_active ? "default" : "secondary"}>
                          {survey.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditSurveyId(survey.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Survey
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRealtimeViewSurveyId(survey.id)}>
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Live Results
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedSurveyId(survey.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Results
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleSurveyStatus(survey.id, survey.is_active)}>
                              {survey.is_active ? (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick({ id: survey.id, title: survey.title })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Survey
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-lg">{survey.title}</CardTitle>
                      {survey.description && (
                        <CardDescription className="line-clamp-2 mt-2">
                          {survey.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(survey.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedSurveyId(survey.id)}
                        className="w-full"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Results
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <CreateSurveyDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
            
            <EditSurveyDialog
              surveyId={editSurveyId}
              open={!!editSurveyId}
              onOpenChange={(open) => !open && setEditSurveyId(null)}
            />
            
            {selectedSurveyId && (
              <SurveyResultsDialog
                surveyId={selectedSurveyId}
                open={!!selectedSurveyId}
                onOpenChange={(open) => !open && setSelectedSurveyId(null)}
              />
            )}

            {realtimeViewSurveyId && (
              <SurveyResultsDialog
                surveyId={realtimeViewSurveyId}
                open={!!realtimeViewSurveyId}
                onOpenChange={(open) => !open && setRealtimeViewSurveyId(null)}
                realtime
              />
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Survey</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{surveyToDelete?.title}"? This will permanently delete the survey and all its responses. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
