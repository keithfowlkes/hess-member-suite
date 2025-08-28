-- Create default HESS Consortium invoice template
INSERT INTO public.invoice_templates (
  name,
  header_content,
  footer_content,
  custom_styles,
  is_default
) VALUES (
  'HESS Consortium Default Template',
  '<div class="header-content">
    <div class="logo-section">
      {{LOGO}}
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <div class="invoice-number">Invoice #{{INVOICE_NUMBER}}</div>
    </div>
  </div>
  <div class="company-info">
    <h2>HESS Consortium</h2>
    <p>Higher Education Systems & Services Consortium</p>
    <p>A consortium of private, non-profit colleges and universities</p>
  </div>',
  '<div class="footer-content">
    <div class="payment-info">
      <h3>Payment Information</h3>
      <p><strong>Payment Terms:</strong> Net {{PAYMENT_TERMS}} days</p>
      <p><strong>Due Date:</strong> {{DUE_DATE}}</p>
      <p>Please include invoice number {{INVOICE_NUMBER}} with your payment.</p>
    </div>
    <div class="contact-info">
      <h3>Questions about your invoice?</h3>
      <p>Contact us at: <a href="mailto:billing@hessconsortium.org">billing@hessconsortium.org</a></p>
      <p>Visit us online: <a href="https://www.hessconsortium.org">www.hessconsortium.org</a></p>
      <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
        Thank you for being a valued member of the HESS Consortium community!
      </p>
    </div>
  </div>',
  '{
    "primaryColor": "#2563eb",
    "secondaryColor": "#1d4ed8",
    "accentColor": "#f0f9ff",
    "textColor": "#333333",
    "borderColor": "#e5e7eb"
  }',
  true
)
ON CONFLICT (name) DO UPDATE SET
  header_content = EXCLUDED.header_content,
  footer_content = EXCLUDED.footer_content,
  custom_styles = EXCLUDED.custom_styles,
  is_default = EXCLUDED.is_default,
  updated_at = now();

-- Ensure no other templates are marked as default
UPDATE public.invoice_templates 
SET is_default = false 
WHERE name != 'HESS Consortium Default Template';