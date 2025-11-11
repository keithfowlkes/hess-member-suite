import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSurveys, useUpdateSurvey, useSurveyResponses } from '@/hooks/useSurveys';
import { CreateSurveyDialog } from '@/components/CreateSurveyDialog';
import { SurveyResultsDialog } from '@/components/SurveyResultsDialog';
import { Plus, FileQuestion, Users, Calendar, MoreVertical, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
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

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading surveys...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Survey Management
            </h1>
            <p className="text-muted-foreground">
              Create and manage member surveys
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Survey
          </Button>
        </div>

        {!surveys || surveys.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center py-12">
                <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No surveys yet</h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  Get started by creating your first survey for members
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Survey
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <Card key={survey.id} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <FileQuestion className="h-5 w-5" />
                      </div>
                      <Badge variant={survey.is_active ? "default" : "secondary"}>
                        {survey.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
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
                  <CardTitle className="text-xl">
                    {survey.title}
                  </CardTitle>
                  {survey.description && (
                    <CardDescription className="line-clamp-2">
                      {survey.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(survey.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedSurveyId(survey.id)}
                    className="w-full"
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
    </Layout>
  );
}
