import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSurveys } from '@/hooks/useSurveys';
import { SurveyResponseDialog } from '@/components/SurveyResponseDialog';
import { SurveyResultsDialog } from '@/components/SurveyResultsDialog';
import { FileQuestion, Calendar, Clock, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

export default function Surveys() {
  const { data: surveys, isLoading } = useSurveys();
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [viewResultsSurveyId, setViewResultsSurveyId] = useState<string | null>(null);

  const activeSurveys = surveys?.filter(s => s.is_active) || [];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
          <div className="container mx-auto py-6 px-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Member Surveys</h1>
                <p className="text-muted-foreground mt-1">
                  Complete surveys to help us improve our services
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">Loading surveys...</div>
            ) : activeSurveys.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No active surveys</h3>
                    <p className="text-muted-foreground max-w-md">
                      There are currently no surveys available. Check back later for new surveys.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeSurveys.map((survey) => (
                  <Card key={survey.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">Active</Badge>
                        {survey.expires_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Expires {format(new Date(survey.expires_at), 'MMM d')}</span>
                          </div>
                        )}
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
                        <span>Created {format(new Date(survey.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setSelectedSurvey(survey.id)} 
                          className="flex-1"
                          size="sm"
                        >
                          Take Survey
                        </Button>
                        <Button 
                          onClick={() => setViewResultsSurveyId(survey.id)} 
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Results
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedSurvey && (
              <SurveyResponseDialog
                surveyId={selectedSurvey}
                open={!!selectedSurvey}
                onOpenChange={(open) => !open && setSelectedSurvey(null)}
              />
            )}

            {viewResultsSurveyId && (
              <SurveyResultsDialog
                surveyId={viewResultsSurveyId}
                open={!!viewResultsSurveyId}
                onOpenChange={(open) => !open && setViewResultsSurveyId(null)}
                realtime
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
