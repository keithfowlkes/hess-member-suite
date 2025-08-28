-- Fix RLS policy for reassignment requests during registration
-- The issue is that users submitting reassignment requests during registration
-- are not authenticated yet, so we need to allow unauthenticated inserts

DROP POLICY IF EXISTS "Allow reassignment request submissions during registration" ON organization_reassignment_requests;

-- Create a new policy that allows inserts without authentication requirement
CREATE POLICY "Allow unauthenticated reassignment request submissions" 
ON organization_reassignment_requests 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);