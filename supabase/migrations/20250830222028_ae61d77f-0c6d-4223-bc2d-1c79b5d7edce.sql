-- Enable real-time updates for pending_registrations table
ALTER TABLE public.pending_registrations REPLICA IDENTITY FULL;