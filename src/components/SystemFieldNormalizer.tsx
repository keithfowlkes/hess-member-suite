import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Eye, 
  Play,
  Info
} from 'lucide-react';
import {
  previewNormalization,
  executeNormalization
} from '@/utils/normalizeSystemFields';

interface PreviewItem {
  organizationId: string;
  fieldName: string;
  currentValue: string | null;
  proposedValue: string | null;
  organizationName: string;
}

const FIELD_LABELS: { [key: string]: string } = {
  student_information_system: 'Student Information System',
  financial_system: 'Finance System',
  financial_aid: 'FinAid System',
  hcm_hr: 'HCM/HR System',
  payroll_system: 'Payroll System',
  purchasing_system: 'Purchasing System',
  housing_management: 'Housing Management',
  learning_management: 'Learning Management',
  admissions_crm: 'Admissions CRM',
  alumni_advancement_crm: 'Alumni/Advancement CRM'
};

export const SystemFieldNormalizer = () => {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFieldToggle = (fieldName: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldName) 
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handlePreview = async () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to normalize');
      return;
    }

    setLoading(true);
    try {
      const previewData = await previewNormalization(selectedFields);
      setPreview(previewData);
      setShowPreview(true);
      toast.success(`Found ${previewData.length} records that will be normalized`);
    } catch (error) {
      toast.error('Error generating preview');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!showPreview || preview.length === 0) {
      toast.error('Please generate a preview first');
      return;
    }

    const confirmed = window.confirm(
      `This will normalize ${preview.length} records across ${selectedFields.length} field(s). Continue?`
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await executeNormalization(selectedFields, true);
      
      if (result.success) {
        toast.success(`Successfully normalized ${result.processed} records`);
        setShowPreview(false);
        setPreview([]);
      } else {
        toast.error(`Normalization completed with ${result.errors.length} errors`);
        console.error('Normalization errors:', result.errors);
      }
    } catch (error) {
      toast.error('Error executing normalization');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const groupedPreview = preview.reduce((acc, item) => {
    if (!acc[item.fieldName]) acc[item.fieldName] = [];
    acc[item.fieldName].push(item);
    return acc;
  }, {} as { [fieldName: string]: PreviewItem[] });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Field Data Normalization
          </CardTitle>
          <CardDescription>
            Normalize organization system field data to match configured System Field Options.
            This process will standardize variations in system field data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This tool will standardize variations in system field data (e.g., "Banner" → "Ellucian Banner").
              Always review the preview before executing changes.
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="font-medium mb-3">Select Fields to Normalize:</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(FIELD_LABELS).map(([fieldName, label]) => (
                <div key={fieldName} className="flex items-center space-x-2">
                  <Checkbox
                    id={fieldName}
                    checked={selectedFields.includes(fieldName)}
                    onCheckedChange={() => handleFieldToggle(fieldName)}
                  />
                  <label
                    htmlFor={fieldName}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handlePreview}
              disabled={loading || selectedFields.length === 0}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Changes
            </Button>
            
            <Button
              onClick={handleExecute}
              disabled={loading || !showPreview || preview.length === 0}
              variant="default"
            >
              <Play className="h-4 w-4 mr-2" />
              Execute Normalization
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Normalization Preview
            </CardTitle>
            <CardDescription>
              {preview.length} records will be updated across {Object.keys(groupedPreview).length} field(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {Object.entries(groupedPreview).map(([fieldName, items]) => (
                <div key={fieldName} className="mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    {FIELD_LABELS[fieldName]}
                    <Badge variant="secondary">{items.length} changes</Badge>
                  </h4>
                  
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/50">
                        <div className="font-medium text-sm">{item.organizationName}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="line-through text-red-600">{item.currentValue}</span>
                          <span className="mx-2">→</span>
                          <span className="text-green-600 font-medium">{item.proposedValue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {Object.keys(groupedPreview).indexOf(fieldName) < Object.keys(groupedPreview).length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {showPreview && preview.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            No normalization needed for the selected fields. All data appears to be already standardized.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};