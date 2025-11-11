import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSurveyResponses, useSurveyQuestions } from '@/hooks/useSurveys';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, BarChart3 } from 'lucide-react';
import { RealtimeSurveyCharts } from './RealtimeSurveyCharts';

export function SurveyResultsDialog({ 
  surveyId, 
  open, 
  onOpenChange,
  realtime = false
}: { 
  surveyId: string; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  realtime?: boolean;
}) {
  const { data: responses } = useSurveyResponses(surveyId);
  const { data: questions } = useSurveyQuestions(surveyId);

  const getQuestionStats = (questionId: string) => {
    const answers = responses?.flatMap(r => 
      r.survey_answers?.filter((a: any) => a.question_id === questionId) || []
    ) || [];

    const question = questions?.find(q => q.id === questionId);
    
    if (question?.question_type === 'rating') {
      const ratings = answers.map((a: any) => parseInt(a.answer_text || '0'));
      const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0';
      return { type: 'rating', average: avg, count: ratings.length };
    }

    if (question?.question_type === 'single_choice' || question?.question_type === 'multiple_choice') {
      const choices: Record<string, number> = {};
      answers.forEach((a: any) => {
        if (a.answer_text) {
          choices[a.answer_text] = (choices[a.answer_text] || 0) + 1;
        }
        if (a.answer_options?.selected) {
          a.answer_options.selected.forEach((opt: string) => {
            choices[opt] = (choices[opt] || 0) + 1;
          });
        }
      });
      return { type: 'choices', choices, total: answers.length };
    }

    return { type: 'text', responses: answers.map((a: any) => a.answer_text || '') };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{realtime ? 'Live Survey Results' : 'Survey Results'}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {responses?.length || 0} responses received
            {realtime && <Badge variant="secondary" className="ml-2">Live Updates</Badge>}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {realtime ? (
            <RealtimeSurveyCharts surveyId={surveyId} />
          ) : (
            <div className="space-y-6">
            {questions?.map((question, index) => {
              const stats = getQuestionStats(question.id);
              
              return (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle className="text-base font-medium">
                      {index + 1}. {question.question_text}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.type === 'rating' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          <span className="text-2xl font-bold">{stats.average}</span>
                          <span className="text-muted-foreground">/ 5.0 average rating</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{stats.count} responses</p>
                      </div>
                    )}

                    {stats.type === 'choices' && (
                      <div className="space-y-3">
                        {Object.entries(stats.choices).map(([choice, count]) => (
                          <div key={choice} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{choice}</span>
                              <Badge variant="secondary">{count} responses</Badge>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${((count as number) / (stats.total || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {stats.type === 'text' && (
                      <div className="space-y-2">
                        {stats.responses.length > 0 ? (
                          stats.responses.map((response: string, idx: number) => (
                            <Card key={idx} className="bg-muted/50">
                              <CardContent className="pt-4">
                                <p className="text-sm">{response || '(No response)'}</p>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No responses yet</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
