-- Drop the overly permissive policy that allows anyone to read all records
DROP POLICY IF EXISTS "Anonymous users can view their submissions" ON member_registration_updates;

-- The remaining policies are correct:
-- 1. "Admins can view all registration updates" - admins can see everything
-- 2. "Users can view their own registration updates" - authenticated users see their own
-- 3. "Allow anonymous and authenticated inserts" - anyone can submit new registrations
-- 4. Admin update/delete policies are also correct