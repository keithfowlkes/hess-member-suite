import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSurveys } from '@/hooks/useSurveys';
import { SurveyResponseDialog } from '@/components/SurveyResponseDialog';
import { FileQuestion, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Surveys() {
  const { data: surveys, isLoading } = useSurveys();
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading surveys...</div>
        </div>
      </Layout>
    );
  }

  const activeSurveys = surveys?.filter(s => s.is_active) || [];

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Member Surveys
          </h1>
          <p className="text-muted-foreground">
            Complete surveys to help us improve our services
          </p>
        </div>

        {activeSurveys.length === 0 ? (
          <Card className="border-dashed">
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeSurveys.map((survey) => (
              <Card key={survey.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <FileQuestion className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="font-normal">
                        Active
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
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
                      <span>Created {format(new Date(survey.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  {survey.expires_at && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Expires {format(new Date(survey.expires_at), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  <Button 
                    onClick={() => setSelectedSurvey(survey.id)} 
                    className="w-full"
                  >
                    Take Survey
                  </Button>
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
      </div>
    </Layout>
  );
}
