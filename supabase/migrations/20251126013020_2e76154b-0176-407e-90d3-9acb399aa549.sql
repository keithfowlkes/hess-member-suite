-- Allow users to update their own survey responses
CREATE POLICY "Users can update their own responses"
ON survey_responses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own survey answers
CREATE POLICY "Users can update their own answers"
ON survey_answers
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM survey_responses
  WHERE survey_responses.id = survey_answers.response_id
  AND survey_responses.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM survey_responses
  WHERE survey_responses.id = survey_answers.response_id
  AND survey_responses.user_id = auth.uid()
));

-- Allow users to delete their own survey answers (for updating)
CREATE POLICY "Users can delete their own answers"
ON survey_answers
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM survey_responses
  WHERE survey_responses.id = survey_answers.response_id
  AND survey_responses.user_id = auth.uid()
));