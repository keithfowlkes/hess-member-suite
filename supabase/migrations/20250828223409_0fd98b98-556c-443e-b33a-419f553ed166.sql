-- Drop all existing policies and create the most permissive ones possible
DROP POLICY IF EXISTS "Allow anyone to insert reassignment requests" ON organization_reassignment_requests;
DROP POLICY IF EXISTS "Admins can select all reassignment requests" ON organization_reassignment_requests;
DROP POLICY IF EXISTS "Admins can update all reassignment requests" ON organization_reassignment_requests;
DROP POLICY IF EXISTS "Admins can delete all reassignment requests" ON organization_reassignment_requests;

-- Create completely permissive policies that don't depend on any functions
CREATE POLICY "bypass_insert" ON organization_reassignment_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "bypass_select" ON organization_reassignment_requests FOR SELECT USING (true);
CREATE POLICY "bypass_update" ON organization_reassignment_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "bypass_delete" ON organization_reassignment_requests FOR DELETE USING (true);