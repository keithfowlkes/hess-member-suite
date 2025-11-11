import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateSurveyWithQuestions, useSurveyQuestions } from '@/hooks/useSurveys';
import { Plus, Trash2, CheckSquare, ListOrdered, Cloud, FileText, MessageSquare, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Question {
  question_text: string;
  question_type: string;
  options?: string[];
  required: boolean;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  expires_at: string | null;
  is_active: boolean;
}

const questionTypes = [
  { 
    value: 'multiple_choice', 
    label: 'Multiple Choice', 
    icon: CheckSquare, 
    description: 'Choose one answer from multiple options',
    needsOptions: true 
  },
  { 
    value: 'multiple_select', 
    label: 'Multiple Select', 
    icon: ListOrdered, 
    description: 'Select multiple answers from options',
    needsOptions: true 
  },
  { 
    value: 'single_choice', 
    label: 'Single Choice', 
    icon: ListOrdered, 
    description: 'Select one option from a list',
    needsOptions: true 
  },
  { 
    value: 'ranking', 
    label: 'Ranking', 
    icon: ListOrdered, 
    description: 'Rank options in order of preference',
    needsOptions: true 
  },
  { 
    value: 'word_cloud', 
    label: 'Word Cloud', 
    icon: Cloud, 
    description: 'Single word or phrase per response',
    needsOptions: false 
  },
  { 
    value: 'open_ended', 
    label: 'Open Ended', 
    icon: MessageSquare, 
    description: 'Long form text response',
    needsOptions: false 
  },
  { 
    value: 'rating', 
    label: 'Rating', 
    icon: Star, 
    description: '1-5 star rating scale',
    needsOptions: false 
  },
];

export function EditSurveyDialog({ 
  surveyId, 
  open, 
  onOpenChange 
}: { 
  surveyId: string | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  const updateSurvey = useUpdateSurveyWithQuestions();
  const { data: existingQuestions } = useSurveyQuestions(surveyId || '');
  const { toast } = useToast();

  useEffect(() => {
    if (surveyId && open) {
      setLoading(true);
      
      // Fetch survey data
      supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single()
        .then(({ data, error }) => {
          if (data) {
            setTitle(data.title || '');
            setDescription(data.description || '');
            setExpiresAt(data.expires_at ? new Date(data.expires_at).toISOString().split('T')[0] : '');
          }
          setLoading(false);
        });
    }
  }, [surveyId, open]);

  useEffect(() => {
    if (existingQuestions && existingQuestions.length > 0) {
      const mappedQuestions = existingQuestions.map(q => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options?.choices || [],
        required: q.required,
      }));
      setQuestions(mappedQuestions);
    }
  }, [existingQuestions]);

  const addQuestion = () => {
    setQuestions([...questions, { question_text: '', question_type: 'multiple_choice', required: false, options: [] }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    if (!surveyId) return;

    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a survey title.',
        variant: 'destructive',
      });
      return;
    }

    if (questions.some(q => !q.question_text.trim())) {
      toast({
        title: 'Validation Error',
        description: 'All questions must have text.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that questions requiring options have options
    const questionsMissingOptions = questions.filter(q => 
      (q.question_type === 'single_choice' || 
       q.question_type === 'multiple_choice' || 
       q.question_type === 'multiple_select' ||
       q.question_type === 'ranking') && 
      (!q.options || q.options.length === 0)
    );

    if (questionsMissingOptions.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Questions of type "${questionsMissingOptions[0].question_type.replace('_', ' ')}" must have at least one option. Please add options for all choice and ranking questions.`,
        variant: 'destructive',
      });
      return;
    }

    await updateSurvey.mutateAsync({
      id: surveyId,
      survey: {
        title,
        description,
        expires_at: expiresAt || null,
        is_active: true,
      },
      questions: questions.map((q) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options ? { choices: q.options } : null,
        required: q.required,
      })),
    });

    onOpenChange(false);
  };

  if (!surveyId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Survey</DialogTitle>
          <DialogDescription>
            Update your survey details and questions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">Loading survey...</div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Survey Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter survey title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the purpose of this survey"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires">Expiration Date (Optional)</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Questions</h3>
                  <Button onClick={addQuestion} size="sm" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </div>

                {questions.map((question, index) => {
                  const selectedType = questionTypes.find(t => t.value === question.question_type);
                  const TypeIcon = selectedType?.icon || FileText;
                  
                  return (
                    <Card key={index} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <TypeIcon className="h-3 w-3" />
                              Question {index + 1}
                            </Badge>
                          </div>
                          {questions.length > 1 && (
                            <Button
                              onClick={() => removeQuestion(index)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Question Text *</Label>
                          <Input
                            value={question.question_text}
                            onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                            placeholder="Enter your question"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label>Question Type</Label>
                          <Select
                            value={question.question_type}
                            onValueChange={(value) => {
                              updateQuestion(index, 'question_type', value);
                              const newType = questionTypes.find(t => t.value === value);
                              if (newType?.needsOptions && !question.options?.length) {
                                updateQuestion(index, 'options', ['Option 1', 'Option 2', 'Option 3']);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select question type" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              {questionTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                  <SelectItem 
                                    key={type.value} 
                                    value={type.value}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-start gap-2 py-1">
                                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-sm">{type.label}</span>
                                        <span className="text-xs text-muted-foreground leading-tight">
                                          {type.description}
                                        </span>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          {selectedType && (
                            <div className="rounded-md bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground">
                                <strong>Selected:</strong> {selectedType.description}
                              </p>
                            </div>
                          )}
                        </div>

                        {(question.question_type === 'single_choice' || 
                          question.question_type === 'multiple_choice' || 
                          question.question_type === 'multiple_select' ||
                          question.question_type === 'ranking') && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Answer Options *</Label>
                              <Badge variant="secondary" className="text-xs">
                                {question.options?.length || 0} options
                              </Badge>
                            </div>
                            <Textarea
                              value={question.options?.join('\n') || ''}
                              onChange={(e) => updateQuestion(index, 'options', e.target.value.split('\n').filter(o => o.trim()))}
                              placeholder="Option 1&#10;Option 2&#10;Option 3&#10;Option 4"
                              rows={5}
                              className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter one option per line. Members will see these as choices.
                            </p>
                          </div>
                        )}

                        {question.question_type === 'word_cloud' && (
                          <Card className="bg-muted/50">
                            <CardContent className="pt-4">
                              <p className="text-sm text-muted-foreground">
                                Members will enter a single word or short phrase. Each response will be displayed in a word cloud visualization where frequently submitted words appear larger.
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {question.question_type === 'open_ended' && (
                          <Card className="bg-muted/50">
                            <CardContent className="pt-4">
                              <p className="text-sm text-muted-foreground">
                                Members can provide detailed text responses. Ideal for gathering in-depth feedback and opinions.
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {question.question_type === 'rating' && (
                          <Card className="bg-muted/50">
                            <CardContent className="pt-4">
                              <p className="text-sm text-muted-foreground">
                                Members will rate using a 1-5 star scale. Results will show average rating and distribution.
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id={`required-${index}`}
                            checked={question.required}
                            onCheckedChange={(checked) => updateQuestion(index, 'required', checked)}
                          />
                          <Label htmlFor={`required-${index}`} className="font-normal cursor-pointer">
                            Required question
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              !title.trim() || 
              questions.some(q => !q.question_text.trim()) || 
              questions.some(q => 
                (q.question_type === 'single_choice' || 
                 q.question_type === 'multiple_choice' || 
                 q.question_type === 'multiple_select' ||
                 q.question_type === 'ranking') && 
                (!q.options || q.options.length === 0)
              ) ||
              loading
            }
          >
            Update Survey
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
