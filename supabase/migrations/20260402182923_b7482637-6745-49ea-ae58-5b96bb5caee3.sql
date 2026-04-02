-- Create simplelists sync log table
CREATE TABLE public.simplelists_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  email TEXT NOT NULL,
  organization_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simplelists_sync_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view sync logs
CREATE POLICY "Admins can view simplelists sync logs"
ON public.simplelists_sync_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only service role can insert (edge functions)
CREATE POLICY "Service role can insert sync logs"
ON public.simplelists_sync_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for quick lookups
CREATE INDEX idx_simplelists_sync_log_created_at ON public.simplelists_sync_log (created_at DESC);
CREATE INDEX idx_simplelists_sync_log_email ON public.simplelists_sync_log (email);