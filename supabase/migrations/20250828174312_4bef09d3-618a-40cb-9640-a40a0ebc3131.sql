-- Update the default HESS Consortium invoice template with gray color scheme
UPDATE public.invoice_templates 
SET 
  custom_styles = '{
    "primaryColor": "#6b7280",
    "secondaryColor": "#4b5563",
    "accentColor": "#f9fafb",
    "textColor": "#333333",
    "borderColor": "#e5e7eb"
  }',
  updated_at = now()
WHERE name = 'HESS Consortium Default Template';