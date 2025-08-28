-- Drop existing INSERT policy and create a more explicit one
DROP POLICY IF EXISTS "Allow unauthenticated reassignment request submissions" ON organization_reassignment_requests;

-- Create a new policy that explicitly allows all inserts
CREATE POLICY "Allow all reassignment request inserts" 
ON organization_reassignment_requests 
FOR INSERT 
WITH CHECK (true);

-- Grant insert permission to anon role explicitly  
GRANT INSERT ON organization_reassignment_requests TO anon;