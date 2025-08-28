-- Re-enable RLS and create a comprehensive policy
ALTER TABLE organization_reassignment_requests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow reassignment request submissions" ON organization_reassignment_requests;
DROP POLICY IF EXISTS "Admins can view all reassignment requests" ON organization_reassignment_requests;
DROP POLICY IF EXISTS "Admins can update reassignment requests" ON organization_reassignment_requests;
DROP POLICY IF EXISTS "Admins can delete reassignment requests" ON organization_reassignment_requests;

-- Create simple, permissive policies for testing
CREATE POLICY "Allow anyone to insert reassignment requests" 
ON organization_reassignment_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can select all reassignment requests" 
ON organization_reassignment_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all reassignment requests" 
ON organization_reassignment_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all reassignment requests" 
ON organization_reassignment_requests 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));