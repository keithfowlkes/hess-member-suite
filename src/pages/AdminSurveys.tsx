import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSurveys, useUpdateSurvey } from '@/hooks/useSurveys';
import { CreateSurveyDialog } from '@/components/CreateSurveyDialog';
import { SurveyResultsDialog } from '@/components/SurveyResultsDialog';
import { Plus, FileQuestion, Calendar, MoreVertical, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminSurveys() {
  const { data: surveys, isLoading } = useSurveys();
  const updateSurvey = useUpdateSurvey();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  const toggleSurveyStatus = (surveyId: string, currentStatus: boolean) => {
    updateSurvey.mutate({ id: surveyId, is_active: !currentStatus });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
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
            
            {selectedSurveyId && (
              <SurveyResultsDialog
                surveyId={selectedSurveyId}
                open={!!selectedSurveyId}
                onOpenChange={(open) => !open && setSelectedSurveyId(null)}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
