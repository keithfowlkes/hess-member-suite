import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSurveyResponses, useSurveyQuestions } from '@/hooks/useSurveys';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Users, TrendingUp } from 'lucide-react';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const CLOUD_COLORS = [
  'rgb(59, 130, 246)', // bright blue
  'rgb(236, 72, 153)', // hot pink
  'rgb(34, 197, 94)', // vivid green
  'rgb(249, 115, 22)', // bright orange
  'rgb(168, 85, 247)', // vibrant purple
  'rgb(234, 179, 8)', // golden yellow
  'rgb(239, 68, 68)', // bright red
  'rgb(20, 184, 166)', // teal
  'rgb(244, 63, 94)', // rose
  'rgb(14, 165, 233)', // sky blue
  'rgb(139, 92, 246)', // violet
  'rgb(251, 146, 60)', // amber
  'rgb(16, 185, 129)', // emerald
  'rgb(217, 70, 239)', // fuchsia
  'rgb(6, 182, 212)', // cyan
  'rgb(132, 204, 22)', // lime
];

export function RealtimeSurveyCharts({ surveyId }: { surveyId: string }) {
  const { data: responses, refetch } = useSurveyResponses(surveyId);
  const { data: questions } = useSurveyQuestions(surveyId);
  const [realtimeCount, setRealtimeCount] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel('survey-responses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'survey_responses',
          filter: `survey_id=eq.${surveyId}`,
        },
        () => {
          refetch();
          setRealtimeCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [surveyId, refetch]);

  const getQuestionChartData = (questionId: string) => {
    const answers = responses?.flatMap(r => 
      r.survey_answers?.filter((a: any) => a.question_id === questionId) || []
    ) || [];

    const question = questions?.find(q => q.id === questionId);
    
    if (question?.question_type === 'multiple_choice' || 
        question?.question_type === 'single_choice' ||
        question?.question_type === 'multiple_select') {
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
      
      return Object.entries(choices).map(([name, value]) => ({ name, value }));
    }

    if (question?.question_type === 'ranking') {
      const rankingScores: Record<string, number> = {};
      const rankingCounts: Record<string, number> = {};
      
      answers.forEach((a: any) => {
        const rankings = a.answer_options?.rankings || {};
        Object.entries(rankings).forEach(([option, rank]: [string, any]) => {
          const score = parseInt(rank) || 0;
          if (score > 0) {
            // Lower rank number = higher score (1st place gets most points)
            const points = (question.options?.choices?.length || 5) - score + 1;
            rankingScores[option] = (rankingScores[option] || 0) + points;
            rankingCounts[option] = (rankingCounts[option] || 0) + 1;
          }
        });
      });
      
      return Object.entries(rankingScores)
        .map(([name, totalScore]) => ({
          name,
          value: Math.round(totalScore / (rankingCounts[name] || 1))
        }))
        .sort((a, b) => b.value - a.value);
    }

    if (question?.question_type === 'word_cloud') {
      const phrases: Record<string, number> = {};
      answers.forEach((a: any) => {
        const text = (a.answer_text || '').trim();
        if (text.length > 0) {
          const clean = text.toLowerCase();
          phrases[clean] = (phrases[clean] || 0) + 1;
        }
      });
      
      return Object.entries(phrases)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }));
    }

    if (question?.question_type === 'rating') {
      const ratings = answers.map((a: any) => parseInt(a.answer_text || '0'));
      const distribution: Record<number, number> = {};
      ratings.forEach(r => {
        distribution[r] = (distribution[r] || 0) + 1;
      });
      
      return [1, 2, 3, 4, 5].map(rating => ({
        name: `${rating} Star${rating !== 1 ? 's' : ''}`,
        value: distribution[rating] || 0
      }));
    }

    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{responses?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Responses</p>
            </div>
          </div>
          {realtimeCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Live Updates: {realtimeCount}
            </Badge>
          )}
        </div>
      </div>

      {questions?.map((question, index) => {
        const chartData = getQuestionChartData(question.id);
        const showChart = ['multiple_choice', 'single_choice', 'multiple_select', 'ranking', 'word_cloud', 'rating'].includes(question.question_type);
        
        if (!showChart) return null;

        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                {index + 1}. {question.question_text}
              </CardTitle>
              <Badge variant="outline" className="w-fit">
                {question.question_type.replace('_', ' ')}
              </Badge>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="space-y-4">
                  {question.question_type === 'word_cloud' ? (
                    <div className="relative w-full" style={{ height: '400px', overflow: 'hidden' }}>
                      <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                        {chartData.map((item, idx) => {
                          const maxValue = Math.max(...chartData.map(d => d.value));
                          const minValue = Math.min(...chartData.map(d => d.value));
                          const normalizedSize = maxValue === minValue ? 0.5 : (item.value - minValue) / (maxValue - minValue);
                          
                          // Smaller, more contained font sizes
                          const fontSize = 14 + (normalizedSize * 28); // 14-42px range
                          const opacity = 0.5 + (normalizedSize * 0.5); // 0.5-1.0 range
                          const fontWeight = normalizedSize > 0.7 ? 700 : normalizedSize > 0.4 ? 600 : 500;
                          
                          // Tighter grid with better padding
                          const padding = 50;
                          const usableWidth = 800 - (padding * 2);
                          const usableHeight = 400 - (padding * 2);
                          
                          const totalItems = chartData.length;
                          const cols = Math.ceil(Math.sqrt(totalItems * 1.8));
                          const rows = Math.ceil(totalItems / cols);
                          const col = idx % cols;
                          const row = Math.floor(idx / cols);
                          
                          // Reduced randomness for better containment
                          const randomX = (Math.sin(idx * 12.345) * 15);
                          const randomY = (Math.cos(idx * 23.456) * 10);
                          
                          const x = padding + (col * (usableWidth / cols)) + (usableWidth / (cols * 2)) + randomX;
                          const y = padding + (row * (usableHeight / rows)) + (usableHeight / (rows * 2)) + randomY;
                          
                          const color = CLOUD_COLORS[idx % CLOUD_COLORS.length];
                          
                          return (
                            <text
                              key={idx}
                              x={x}
                              y={y}
                              fontSize={fontSize}
                              fontWeight={fontWeight}
                              fill={color}
                              opacity={opacity}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="animate-fade-in transition-all duration-300 hover:opacity-100 cursor-default"
                              style={{
                                animationDelay: `${idx * 0.05}s`,
                              }}
                            >
                              {item.name}
                              <title>{item.name}: {item.value} responses</title>
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        {question.question_type === 'rating' ? (
                          <BarChart data={chartData}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        ) : (
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                      
                      <div className="space-y-2">
                        {chartData.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                              {item.name}
                            </span>
                            <Badge variant="secondary">{item.value}</Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No responses yet</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
