-- Allow users to insert their own cohort memberships
CREATE POLICY "Users can insert their own cohorts" 
ON public.user_cohorts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own cohort memberships  
CREATE POLICY "Users can delete their own cohorts"
ON public.user_cohorts
FOR DELETE
USING (auth.uid() = user_id);