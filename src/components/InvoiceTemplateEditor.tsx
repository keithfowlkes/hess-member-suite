import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvoiceTemplates } from '@/hooks/useInvoiceTemplates';
import { Upload, Eye, Settings } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill.css';
import DOMPurify from 'dompurify';

interface InvoiceTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPLATE_CODES = [
  { code: '{{LOGO}}', description: 'Company logo' },
  { code: '{{INVOICE_NUMBER}}', description: 'Invoice number' },
  { code: '{{INVOICE_DATE}}', description: 'Invoice date' },
  { code: '{{DUE_DATE}}', description: 'Due date' },
  { code: '{{ORGANIZATION_NAME}}', description: 'Organization name' },
  { code: '{{ORGANIZATION_ADDRESS}}', description: 'Organization address' },
  { code: '{{ORGANIZATION_EMAIL}}', description: 'Organization email' },
  { code: '{{ORGANIZATION_PHONE}}', description: 'Organization phone' },
  { code: '{{AMOUNT}}', description: 'Invoice amount' },
  { code: '{{PRORATED_AMOUNT}}', description: 'Prorated amount' },
  { code: '{{PERIOD_START}}', description: 'Period start date' },
  { code: '{{PERIOD_END}}', description: 'Period end date' },
  { code: '{{PAYMENT_TERMS}}', description: 'Payment terms (days)' },
  { code: '{{CONTACT_EMAIL}}', description: 'Contact email' },
  { code: '{{NOTES}}', description: 'Invoice notes' }
];

export function InvoiceTemplateEditor({ open, onOpenChange }: InvoiceTemplateEditorProps) {
  const { templates, loading, updateTemplate, uploadLogo, getDefaultTemplate } = useInvoiceTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState(getDefaultTemplate());
  const [headerContent, setHeaderContent] = useState(selectedTemplate?.header_content || '');
  const [footerContent, setFooterContent] = useState(selectedTemplate?.footer_content || '');
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTemplate) return;

    setUploading(true);
    try {
      const logoUrl = await uploadLogo(file);
      await updateTemplate(selectedTemplate.id, { logo_url: logoUrl });
      setSelectedTemplate({ ...selectedTemplate, logo_url: logoUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      await updateTemplate(selectedTemplate.id, {
        header_content: headerContent,
        footer_content: footerContent
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const insertCode = (code: string, isHeader: boolean) => {
    if (isHeader) {
      setHeaderContent(prev => prev + code);
    } else {
      setFooterContent(prev => prev + code);
    }
  };

  const renderPreview = () => {
    if (!selectedTemplate) return null;

    const sampleData = {
      '{{LOGO}}': selectedTemplate.logo_url ? `<img src="${selectedTemplate.logo_url}" alt="Logo" style="max-height: 80px;" />` : '',
      '{{INVOICE_NUMBER}}': 'INV-2024-001',
      '{{INVOICE_DATE}}': new Date().toLocaleDateString(),
      '{{DUE_DATE}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      '{{ORGANIZATION_NAME}}': 'Sample Organization',
      '{{ORGANIZATION_ADDRESS}}': '123 Main St, City, State 12345',
      '{{ORGANIZATION_EMAIL}}': 'contact@organization.com',
      '{{ORGANIZATION_PHONE}}': '(555) 123-4567',
      '{{AMOUNT}}': '$1,000.00',
      '{{PRORATED_AMOUNT}}': '$750.00',
      '{{PERIOD_START}}': '01/01/2024',
      '{{PERIOD_END}}': '12/31/2024',
      '{{PAYMENT_TERMS}}': '30',
      '{{CONTACT_EMAIL}}': 'billing@company.com',
      '{{NOTES}}': 'Thank you for your membership!'
    };

    let previewHeader = headerContent;
    let previewFooter = footerContent;

    Object.entries(sampleData).forEach(([code, value]) => {
      previewHeader = previewHeader.replace(new RegExp(code, 'g'), value);
      previewFooter = previewFooter.replace(new RegExp(code, 'g'), value);
    });

    return (
      <div className="invoice-preview border rounded-lg p-6 bg-white">
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHeader) }} />
        <div className="invoice-body my-8">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">Annual Membership Fee</td>
                <td className="border p-2 text-right">$1,000.00</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="border p-2 text-right">Total:</td>
                <td className="border p-2 text-right">$1,000.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewFooter) }} />
      </div>
    );
  };

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Invoice Template Editor
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Codes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Template Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TEMPLATE_CODES.map(({ code, description }) => (
                <div key={code} className="flex flex-col space-y-1">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer text-xs justify-start"
                    onClick={() => navigator.clipboard.writeText(code)}
                  >
                    {code}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Template Editor</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                  <Button onClick={handleSave}>Save Template</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  {selectedTemplate?.logo_url && (
                    <img 
                      src={selectedTemplate.logo_url} 
                      alt="Current logo" 
                      className="h-10 w-auto border rounded"
                    />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              {/* Header Content */}
              <div>
                <Label>Header Content</Label>
                <ReactQuill
                  value={headerContent}
                  onChange={setHeaderContent}
                  className="mt-1"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['clean']
                    ]
                  }}
                />
              </div>

              {/* Footer Content */}
              <div>
                <Label>Footer Content</Label>
                <ReactQuill
                  value={footerContent}
                  onChange={setFooterContent}
                  className="mt-1"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['clean']
                    ]
                  }}
                />
              </div>

              {/* Preview */}
              {showPreview && (
                <div>
                  <Label>Preview</Label>
                  <div className="mt-2 max-h-96 overflow-y-auto">
                    {renderPreview()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}