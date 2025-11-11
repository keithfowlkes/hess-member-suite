-- Create surveys table
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  target_audience TEXT DEFAULT 'all' -- 'all', 'specific_cohorts', 'specific_organizations'
);

-- Create survey questions table
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'text', 'textarea', 'single_choice', 'multiple_choice', 'rating'
  options JSONB, -- For choice-based questions
  required BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create survey responses table
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(survey_id, organization_id)
);

-- Create survey answers table
CREATE TABLE public.survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES public.survey_responses(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.survey_questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT,
  answer_options JSONB, -- For multiple choice answers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- Surveys policies
CREATE POLICY "Admins can manage all surveys"
  ON public.surveys FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view active surveys"
  ON public.surveys FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Survey questions policies
CREATE POLICY "Admins can manage survey questions"
  ON public.survey_questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view questions for active surveys"
  ON public.survey_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.is_active = true
    )
  );

-- Survey responses policies
CREATE POLICY "Admins can view all responses"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create responses for their organization"
  ON public.survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT o.id FROM public.organizations o
      JOIN public.profiles p ON p.id = o.contact_person_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own responses"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Survey answers policies
CREATE POLICY "Admins can view all answers"
  ON public.survey_answers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create answers for their responses"
  ON public.survey_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses
      WHERE survey_responses.id = survey_answers.response_id
      AND survey_responses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own answers"
  ON public.survey_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses
      WHERE survey_responses.id = survey_answers.response_id
      AND survey_responses.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_survey_questions_survey_id ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_organization_id ON public.survey_responses(organization_id);
CREATE INDEX idx_survey_answers_response_id ON public.survey_answers(response_id);

-- Create trigger for updating surveys updated_at
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();