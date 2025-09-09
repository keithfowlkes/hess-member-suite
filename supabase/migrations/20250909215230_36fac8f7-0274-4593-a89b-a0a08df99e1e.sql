-- Create system_messages table for admin-posted system-wide messages
CREATE TABLE public.system_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Enable Row Level Security
ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for system messages
CREATE POLICY "Admins can manage all system messages" 
ON public.system_messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view active system messages" 
ON public.system_messages 
FOR SELECT 
USING (is_active = true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_system_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_messages_updated_at
BEFORE UPDATE ON public.system_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_system_messages_updated_at();