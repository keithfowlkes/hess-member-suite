-- Create table for invoice templates
CREATE TABLE public.invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default Template',
  logo_url TEXT,
  header_content TEXT DEFAULT '<h1>Invoice</h1>',
  footer_content TEXT DEFAULT '<p>Thank you for your business!</p>',
  custom_styles JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for admins to manage templates
CREATE POLICY "Admins can manage invoice templates" 
ON public.invoice_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_invoice_templates_updated_at
BEFORE UPDATE ON public.invoice_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.invoice_templates (name, is_default, header_content, footer_content) 
VALUES (
  'Professional Template',
  true,
  '<div class="header-content">
    <div class="logo-section">
      {{LOGO}}
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <p class="invoice-number">{{INVOICE_NUMBER}}</p>
    </div>
  </div>',
  '<div class="footer-content">
    <div class="payment-info">
      <h3>Payment Information</h3>
      <p>Please remit payment within {{PAYMENT_TERMS}} days of invoice date.</p>
      <p>Make checks payable to: {{ORGANIZATION_NAME}}</p>
    </div>
    <div class="contact-info">
      <p>Questions? Contact us at {{CONTACT_EMAIL}}</p>
    </div>
  </div>'
);

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-logos', 'invoice-logos', true);

-- Create policies for logo uploads
CREATE POLICY "Admins can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'invoice-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'invoice-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'invoice-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Logo images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'invoice-logos');