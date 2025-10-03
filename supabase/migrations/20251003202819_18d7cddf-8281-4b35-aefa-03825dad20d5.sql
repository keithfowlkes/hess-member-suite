-- Add requested_cohorts column to pending_registrations table
ALTER TABLE public.pending_registrations 
ADD COLUMN requested_cohorts jsonb DEFAULT '[]'::jsonb;