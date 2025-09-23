-- Create user_cohorts table to support multiple cohorts per user
CREATE TABLE IF NOT EXISTS public.user_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cohort text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, cohort)
);

-- Enable RLS on user_cohorts
ALTER TABLE public.user_cohorts ENABLE ROW LEVEL SECURITY;

-- Create policies for user_cohorts
CREATE POLICY "Admins can manage all user cohorts"
ON public.user_cohorts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Remove the cohort column from profiles as it will be in user_cohorts table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS cohort;