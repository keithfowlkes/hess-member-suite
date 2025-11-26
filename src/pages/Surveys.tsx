import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSurveys } from '@/hooks/useSurveys';
import { SurveyResponseDialog } from '@/components/SurveyResponseDialog';
import { SurveyResultsDialog } from '@/components/SurveyResultsDialog';
import { FileQuestion, Calendar, Clock, BarChart3, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function Surveys() {
  const { data: surveys, isLoading } = useSurveys();
  const { user } = useAuth();
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [viewResultsSurveyId, setViewResultsSurveyId] = useState<string | null>(null);
  const [respondedSurveyIds, setRespondedSurveyIds] = useState<Set<string>>(new Set());

  const activeSurveys = surveys?.filter(s => s.is_active) || [];

  // Check which surveys the user has already responded to
  useEffect(() => {
    const checkResponses = async () => {
      if (!user?.id || !activeSurveys.length) return;

      const { data } = await supabase
        .from('survey_responses')
        .select('survey_id')
        .eq('user_id', user.id)
        .in('survey_id', activeSurveys.map(s => s.id));

      if (data) {
        setRespondedSurveyIds(new Set(data.map(r => r.survey_id)));
      }
    };

    checkResponses();
  }, [user?.id, activeSurveys.length]);

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
                          className="flex-1 gap-2"
                          size="sm"
                          variant={respondedSurveyIds.has(survey.id) ? "outline" : "default"}
                        >
                          {respondedSurveyIds.has(survey.id) && <Edit className="h-4 w-4" />}
                          {respondedSurveyIds.has(survey.id) ? 'Edit Response' : 'Take Survey'}
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
