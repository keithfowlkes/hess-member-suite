-- Drop the incorrect policy
DROP POLICY IF EXISTS "Allow all reassignment request inserts" ON organization_reassignment_requests;

-- Create the correct policy for anon and authenticated users
CREATE POLICY "Allow reassignment request submissions" 
ON organization_reassignment_requests 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Also ensure the anon role has the necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON organization_reassignment_requests TO anon;