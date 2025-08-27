-- Create public_pages table for custom public pages
CREATE TABLE public.public_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.public_pages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all public pages"
ON public.public_pages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Published pages are viewable by everyone"
ON public.public_pages
FOR SELECT
USING (is_published = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_public_pages_updated_at
BEFORE UPDATE ON public.public_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();