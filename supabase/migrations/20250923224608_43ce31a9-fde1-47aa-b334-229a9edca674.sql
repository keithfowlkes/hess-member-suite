-- Add RLS policy to allow authenticated users to read user cohorts
-- This is needed for cohort leaders to see members in their cohorts
CREATE POLICY "Authenticated users can view user cohorts" 
ON user_cohorts 
FOR SELECT 
TO authenticated 
USING (true);