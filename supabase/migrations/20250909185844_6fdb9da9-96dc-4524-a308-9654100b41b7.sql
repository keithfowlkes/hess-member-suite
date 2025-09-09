-- Create analytics datacube table for pre-computed system usage data
CREATE TABLE public.system_analytics_datacube (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  system_field text NOT NULL,
  system_name text NOT NULL,
  institution_count integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the datacube table
ALTER TABLE public.system_analytics_datacube ENABLE ROW LEVEL SECURITY;

-- Create policies for datacube access
CREATE POLICY "Authenticated users can view analytics datacube" 
ON public.system_analytics_datacube 
FOR SELECT 
USING (true);

-- Create index for better performance
CREATE INDEX idx_system_analytics_datacube_field ON public.system_analytics_datacube(system_field);
CREATE INDEX idx_system_analytics_datacube_updated ON public.system_analytics_datacube(last_updated);

-- Create unique index to prevent duplicates
CREATE UNIQUE INDEX idx_system_analytics_datacube_unique 
ON public.system_analytics_datacube(system_field, system_name);

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;