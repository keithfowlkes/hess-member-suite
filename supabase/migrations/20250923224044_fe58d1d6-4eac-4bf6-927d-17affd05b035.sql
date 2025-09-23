-- Add RLS policy to allow users to read their own roles
CREATE POLICY "Users can view their own roles" 
ON user_roles 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());