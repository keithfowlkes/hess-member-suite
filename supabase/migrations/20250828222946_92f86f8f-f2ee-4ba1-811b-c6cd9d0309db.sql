-- Grant all permissions to anon users for reassignment requests table
GRANT ALL ON organization_reassignment_requests TO anon;
GRANT ALL ON organization_reassignment_requests TO authenticated;

-- Also grant sequence permissions if needed
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;