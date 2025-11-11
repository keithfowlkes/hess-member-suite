import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_active: boolean;
  target_audience: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  options: any;
  required: boolean;
  display_order: number;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  organization_id: string | null;
  user_id: string;
  submitted_at: string;
}

export const useSurveys = () => {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Survey[];
    },
  });
};

export const useSurveyQuestions = (surveyId: string) => {
  return useQuery({
    queryKey: ['survey-questions', surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as SurveyQuestion[];
    },
    enabled: !!surveyId,
  });
};

export const useCreateSurvey = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (surveyData: { 
      survey: {
        title: string;
        description?: string | null;
        expires_at?: string | null;
        is_active?: boolean;
        target_audience?: string;
      }, 
      questions: {
        question_text: string;
        question_type: string;
        options?: any;
        required?: boolean;
      }[]
    }) => {
      const { data: surveyResult, error: surveyError } = await supabase
        .from('surveys')
        .insert([surveyData.survey])
        .select()
        .single();
      
      if (surveyError) throw surveyError;

      const questionsWithSurveyId = surveyData.questions.map((q, idx) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        required: q.required ?? false,
        survey_id: surveyResult.id,
        display_order: idx + 1,
      }));

      const { error: questionsError } = await supabase
        .from('survey_questions')
        .insert(questionsWithSurveyId);
      
      if (questionsError) throw questionsError;

      return surveyResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({
        title: 'Survey created',
        description: 'Your survey has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSurvey = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Survey> & { id: string }) => {
      const { data, error } = await supabase
        .from('surveys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({
        title: 'Survey updated',
        description: 'The survey has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSurveyWithQuestions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (surveyData: {
      id: string;
      survey: {
        title: string;
        description?: string | null;
        expires_at?: string | null;
        is_active?: boolean;
        target_audience?: string;
      };
      questions: {
        id?: string;
        question_text: string;
        question_type: string;
        options?: any;
        required?: boolean;
      }[];
    }) => {
      // Update survey metadata
      const { error: surveyError } = await supabase
        .from('surveys')
        .update(surveyData.survey)
        .eq('id', surveyData.id);
      
      if (surveyError) throw surveyError;

      // Delete existing questions
      const { error: deleteError } = await supabase
        .from('survey_questions')
        .delete()
        .eq('survey_id', surveyData.id);
      
      if (deleteError) throw deleteError;

      // Insert updated questions
      const questionsWithSurveyId = surveyData.questions.map((q, idx) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        required: q.required ?? false,
        survey_id: surveyData.id,
        display_order: idx + 1,
      }));

      const { error: questionsError } = await supabase
        .from('survey_questions')
        .insert(questionsWithSurveyId);
      
      if (questionsError) throw questionsError;

      return { id: surveyData.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['survey-questions'] });
      toast({
        title: 'Survey updated',
        description: 'Your survey has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useSurveyResponses = (surveyId?: string) => {
  return useQuery({
    queryKey: ['survey-responses', surveyId],
    queryFn: async () => {
      let query = supabase
        .from('survey_responses')
        .select('*, organizations(name), survey_answers(*)');
      
      if (surveyId) {
        query = query.eq('survey_id', surveyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!surveyId,
  });
};

export const useDeleteSurvey = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (surveyId: string) => {
      // Delete survey answers first
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('survey_id', surveyId);
      
      if (responses && responses.length > 0) {
        const responseIds = responses.map(r => r.id);
        await supabase
          .from('survey_answers')
          .delete()
          .in('response_id', responseIds);
      }

      // Delete survey responses
      await supabase
        .from('survey_responses')
        .delete()
        .eq('survey_id', surveyId);

      // Delete survey questions
      await supabase
        .from('survey_questions')
        .delete()
        .eq('survey_id', surveyId);

      // Delete survey
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', surveyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({
        title: 'Survey deleted',
        description: 'The survey has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useSubmitSurveyResponse = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (responseData: {
      surveyId: string;
      organizationId: string;
      answers: { questionId: string; answerText?: string; answerOptions?: any }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user has already submitted a response for this survey
      const { data: existingResponse } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('survey_id', responseData.surveyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingResponse) {
        throw new Error('DUPLICATE_RESPONSE');
      }

      const { data: response, error: responseError } = await supabase
        .from('survey_responses')
        .insert([{
          survey_id: responseData.surveyId,
          organization_id: responseData.organizationId,
          user_id: user.id,
        }])
        .select()
        .single();
      
      if (responseError) throw responseError;

      const answers = responseData.answers.map(a => ({
        response_id: response.id,
        question_id: a.questionId,
        answer_text: a.answerText,
        answer_options: a.answerOptions,
      }));

      const { error: answersError } = await supabase
        .from('survey_answers')
        .insert(answers);
      
      if (answersError) throw answersError;

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-responses'] });
      toast({
        title: 'Survey submitted',
        description: 'Thank you for completing the survey!',
      });
    },
    onError: (error: any) => {
      const isDuplicate = error.message === 'DUPLICATE_RESPONSE' || 
                         error.message?.includes('duplicate') ||
                         error.code === '23505';
      
      toast({
        title: 'Error',
        description: isDuplicate ? 'You have already voted on this survey.' : error.message,
        variant: 'destructive',
      });
    },
  });
};
