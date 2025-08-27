-- Enable real-time updates for system_field_options table
ALTER TABLE public.system_field_options REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_field_options;