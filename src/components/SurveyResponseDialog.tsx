import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useSurveyQuestions, useSubmitSurveyResponse } from '@/hooks/useSurveys';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

export function SurveyResponseDialog({ 
  surveyId, 
  open, 
  onOpenChange 
}: { 
  surveyId: string; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { data: questions } = useSurveyQuestions(surveyId);
  const submitResponse = useSubmitSurveyResponse();
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [organizationId, setOrganizationId] = useState<string>('');

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user?.id) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) return;
      
      const { data } = await supabase
        .from('organizations')
        .select('id')
        .eq('contact_person_id', profile.id)
        .maybeSingle();
      
      if (data) {
        setOrganizationId(data.id);
      }
    };

    fetchOrganization();
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!organizationId) return;

    const answersArray = questions?.map(q => ({
      questionId: q.id,
      answerText: typeof answers[q.id] === 'string' ? answers[q.id] : undefined,
      answerOptions: typeof answers[q.id] === 'object' ? answers[q.id] : undefined,
    })) || [];

    await submitResponse.mutateAsync({
      surveyId,
      organizationId,
      answers: answersArray,
    });

    setAnswers({});
    onOpenChange(false);
  };

  const renderQuestion = (question: any) => {
    switch (question.question_type) {
      case 'open_ended':
        return (
          <Textarea
            value={answers[question.id] || ''}
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
            placeholder="Share your thoughts..."
            rows={6}
          />
        );
      
      case 'word_cloud':
        return (
          <Input
            value={answers[question.id] || ''}
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
            placeholder="Enter a single word or short phrase"
            maxLength={100}
          />
        );
      
      case 'single_choice':
        return (
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
          >
            {question.options?.choices?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options?.choices?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={(answers[question.id]?.selected || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const current = answers[question.id]?.selected || [];
                    const updated = checked
                      ? [...current, option]
                      : current.filter((o: string) => o !== option);
                    setAnswers({ ...answers, [question.id]: { selected: updated } });
                  }}
                />
                <Label htmlFor={`${question.id}-${option}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      
      case 'ranking':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Rank these options by dragging or numbering (1 = highest)</p>
            {question.options?.choices?.map((option: string, idx: number) => (
              <div key={option} className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max={question.options?.choices?.length}
                  placeholder={`${idx + 1}`}
                  className="w-20"
                  value={(answers[question.id]?.rankings || {})[option] || ''}
                  onChange={(e) => {
                    const current = answers[question.id]?.rankings || {};
                    setAnswers({ 
                      ...answers, 
                      [question.id]: { 
                        rankings: { ...current, [option]: e.target.value } 
                      } 
                    });
                  }}
                />
                <Label className="font-normal">{option}</Label>
              </div>
            ))}
          </div>
        );
      
      case 'rating':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setAnswers({ ...answers, [question.id]: rating.toString() })}
                className="transition-colors"
              >
                <Star
                  className={`h-8 w-8 ${
                    parseInt(answers[question.id] || '0') >= rating
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Complete Survey</DialogTitle>
          <DialogDescription>
            Please answer all required questions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {questions?.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-base">
                      {index + 1}. {question.question_text}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                  </div>
                  <div className="mt-3">
                    {renderQuestion(question)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!organizationId}>
            Submit Survey
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
