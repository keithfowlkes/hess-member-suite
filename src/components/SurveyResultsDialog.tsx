import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSurveyResponses, useSurveyQuestions } from '@/hooks/useSurveys';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, BarChart3, Download, PieChart } from 'lucide-react';
import { RealtimeSurveyCharts } from './RealtimeSurveyCharts';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  const [surveyTitle, setSurveyTitle] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const { toast } = useToast();

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  useEffect(() => {
    if (surveyId) {
      supabase
        .from('surveys')
        .select('title')
        .eq('id', surveyId)
        .single()
        .then(({ data }) => {
          if (data) setSurveyTitle(data.title);
        });
    }
  }, [surveyId]);

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

  const handleExportToExcel = async () => {
    if (!responses || !questions) return;

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Statistics
      const summaryData: any[] = [
        ['Survey Title', surveyTitle],
        ['Total Responses', responses.length],
        ['Export Date', new Date().toLocaleDateString()],
        [],
        ['Question', 'Question Type', 'Summary'],
      ];

      questions.forEach((question, idx) => {
        const stats = getQuestionStats(question.id);
        let summary = '';

        if (stats.type === 'rating') {
          summary = `Average: ${stats.average}/5.0 (${stats.count} responses)`;
        } else if (stats.type === 'choices') {
          const topChoice = Object.entries(stats.choices).sort(([, a], [, b]) => (b as number) - (a as number))[0];
          summary = topChoice ? `Top: ${topChoice[0]} (${topChoice[1]} votes)` : 'No responses';
        } else if (stats.type === 'text') {
          summary = `${stats.responses.length} text responses`;
        }

        summaryData.push([
          `Q${idx + 1}: ${question.question_text}`,
          question.question_type,
          summary,
        ]);
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // Sheet 2: Detailed Responses
      const detailedData: any[] = [
        ['Response ID', 'Organization', 'Submitted At', ...questions.map((q, i) => `Q${i + 1}: ${q.question_text}`)],
      ];

      responses.forEach((response) => {
        const row: any[] = [
          response.id.substring(0, 8),
          response.organizations?.name || 'N/A',
          new Date(response.submitted_at).toLocaleString(),
        ];

        questions.forEach((question) => {
          const answer = response.survey_answers?.find((a: any) => a.question_id === question.id);
          
          if (!answer) {
            row.push('No response');
          } else if (answer.answer_text) {
            row.push(answer.answer_text);
          } else if (answer.answer_options) {
            const options = answer.answer_options as any;
            if (options.selected) {
              row.push(Array.isArray(options.selected) ? options.selected.join(', ') : options.selected);
            } else if (options.rankings) {
              const rankings = Object.entries(options.rankings)
                .sort(([, a], [, b]) => (a as number) - (b as number))
                .map(([opt, rank]) => `${opt} (${rank})`)
                .join(', ');
              row.push(rankings);
            } else {
              row.push('No response');
            }
          } else {
            row.push('No response');
          }
        });

        detailedData.push(row);
      });

      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
      detailedSheet['!cols'] = [
        { wch: 12 },
        { wch: 25 },
        { wch: 20 },
        ...questions.map(() => ({ wch: 30 })),
      ];
      XLSX.utils.book_append_sheet(wb, detailedSheet, 'Responses');

      // Sheet 3: Question Statistics
      questions.forEach((question, qIdx) => {
        const stats = getQuestionStats(question.id);
        
        if (stats.type === 'choices') {
          const chartData: any[] = [
            [`Question ${qIdx + 1}: ${question.question_text}`],
            [],
            ['Option', 'Count', 'Percentage'],
          ];

          const total = stats.total || 1;
          Object.entries(stats.choices)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .forEach(([choice, count]) => {
              chartData.push([
                choice,
                count,
                `${(((count as number) / total) * 100).toFixed(1)}%`,
              ]);
            });

          const chartSheet = XLSX.utils.aoa_to_sheet(chartData);
          chartSheet['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }];
          XLSX.utils.book_append_sheet(wb, chartSheet, `Q${qIdx + 1} Stats`);
        }
      });

      // Generate file name and save
      const fileName = `${surveyTitle.replace(/[^a-z0-9]/gi, '_')}_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: 'Export successful',
        description: 'Survey results have been downloaded as an Excel file.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the survey results.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{realtime ? 'Live Survey Results' : 'Survey Results'}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {responses?.length || 0} responses received
                {realtime && <Badge variant="secondary" className="ml-2">Live Updates</Badge>}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {!realtime && (
                <>
                  <ToggleGroup 
                    type="single" 
                    value={chartType} 
                    onValueChange={(value) => {
                      if (value) setChartType(value as 'bar' | 'pie');
                    }}
                  >
                    <ToggleGroupItem value="bar" aria-label="Bar chart">
                      <BarChart3 className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pie" aria-label="Pie chart">
                      <PieChart className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button
                    onClick={handleExportToExcel}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!responses || responses.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export to Excel
                  </Button>
                </>
              )}
            </div>
          </div>
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
                      <div className="space-y-4">
                        {chartType === 'bar' ? (
                          <ResponsiveContainer width="100%" height={Math.max(200, Object.keys(stats.choices).length * 40)}>
                            <BarChart
                              data={Object.entries(stats.choices).map(([name, value]) => ({ name, value }))}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis type="number" className="text-xs" />
                              <YAxis dataKey="name" type="category" width={150} className="text-xs" />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--popover))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px'
                                }}
                              />
                              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsPieChart>
                              <Pie
                                data={Object.entries(stats.choices).map(([name, value]) => ({ name, value }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="hsl(var(--primary))"
                                dataKey="value"
                              >
                                {Object.entries(stats.choices).map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--popover))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px'
                                }}
                              />
                              <Legend />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        )}
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
