-- Enable realtime for organizations table
ALTER TABLE public.organizations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;

-- Enable realtime for organization_reassignment_requests table  
ALTER TABLE public.organization_reassignment_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_reassignment_requests;