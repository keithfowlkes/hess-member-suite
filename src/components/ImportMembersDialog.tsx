import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

interface CSVRow {
  [key: string]: string;
}

interface FieldMapping {
  csvField: string;
  profileField: string;
}

const profileFields = [
  { value: 'first_name', label: 'First Name', required: true },
  { value: 'last_name', label: 'Last Name', required: true },
  { value: 'email', label: 'Email', required: true },
  { value: 'phone', label: 'Phone' },
  { value: 'organization', label: 'Organization' },
  { value: 'state_association', label: 'State Association' },
  { value: 'student_fte', label: 'Student FTE' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip', label: 'ZIP Code' },
  { value: 'primary_contact_title', label: 'Primary Contact Title' },
  { value: 'secondary_first_name', label: 'Secondary First Name' },
  { value: 'secondary_last_name', label: 'Secondary Last Name' },
  { value: 'secondary_contact_title', label: 'Secondary Contact Title' },
  { value: 'secondary_contact_email', label: 'Secondary Contact Email' },
  { value: 'student_information_system', label: 'Student Information System' },
  { value: 'financial_system', label: 'Financial System' },
  { value: 'financial_aid', label: 'Financial Aid' },
  { value: 'hcm_hr', label: 'HCM/HR' },
  { value: 'payroll_system', label: 'Payroll System' },
  { value: 'purchasing_system', label: 'Purchasing System' },
  { value: 'housing_management', label: 'Housing Management' },
  { value: 'learning_management', label: 'Learning Management' },
  { value: 'admissions_crm', label: 'Admissions CRM' },
  { value: 'alumni_advancement_crm', label: 'Alumni/Advancement CRM' },
  { value: 'payment_platform', label: 'Payment Platform' },
  { value: 'meal_plan_management', label: 'Meal Plan Management' },
  { value: 'identity_management', label: 'Identity Management' },
  { value: 'door_access', label: 'Door Access' },
  { value: 'document_management', label: 'Document Management' },
  { value: 'voip', label: 'VoIP' },
  { value: 'network_infrastructure', label: 'Network Infrastructure' },
  { value: 'secondary_contact_phone', label: 'Secondary Contact Phone' },
  { value: 'primary_office_apple', label: 'Primary Office - Apple' },
  { value: 'primary_office_lenovo', label: 'Primary Office - Lenovo' },
  { value: 'primary_office_dell', label: 'Primary Office - Dell' },
  { value: 'primary_office_hp', label: 'Primary Office - HP' },
  { value: 'primary_office_microsoft', label: 'Primary Office - Microsoft' },
  { value: 'primary_office_other', label: 'Primary Office - Other' },
  { value: 'primary_office_other_details', label: 'Primary Office Other Details' },
  { value: 'other_software_comments', label: 'Other Software Comments' },
];

interface ImportResult {
  successful: string[];
  failed: { email: string; error: string }[];
  existing: string[];
}

interface ImportMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportMembersDialog({ open, onOpenChange }: ImportMembersDialogProps) {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('onDrop called with files:', acceptedFiles);
    const file = acceptedFiles[0];
    if (!file) {
      console.log('No file provided');
      return;
    }
    console.log('Parsing file:', file.name, 'type:', file.type);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        console.log('Parse complete, results:', results);
        if (results.errors.length > 0) {
          toast({
            title: 'CSV Parse Error',
            description: `Error parsing CSV: ${results.errors[0].message}`,
            variant: 'destructive'
          });
          return;
        }

        const data = results.data as CSVRow[];
        const headers = Object.keys(data[0] || {});
        
        setCsvData(data);
        setCsvHeaders(headers);
        
        // Auto-map common fields
        const autoMappings: FieldMapping[] = [];
        profileFields.forEach(field => {
          const matchingHeader = headers.find(header => 
            header.toLowerCase().replace(/[^a-z0-9]/g, '') === 
            field.value.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (matchingHeader) {
            autoMappings.push({
              csvField: matchingHeader,
              profileField: field.value
            });
          }
        });
        
        setFieldMappings(autoMappings);
        setImportResult(null);
      },
      error: (error) => {
        toast({
          title: 'File Read Error',
          description: `Error reading file: ${error.message}`,
          variant: 'destructive'
        });
      }
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  const updateFieldMapping = (csvField: string, profileField: string) => {
    setFieldMappings(prev => {
      const existing = prev.find(m => m.csvField === csvField);
      if (existing) {
        return prev.map(m => 
          m.csvField === csvField 
            ? { ...m, profileField }
            : m
        );
      } else {
        return [...prev, { csvField, profileField }];
      }
    });
  };

  const removeFieldMapping = (csvField: string) => {
    setFieldMappings(prev => prev.filter(m => m.csvField !== csvField));
  };

  const validateMappings = () => {
    const requiredFields = profileFields.filter(f => f.required).map(f => f.value);
    const mappedFields = fieldMappings.map(m => m.profileField);
    const missingRequired = requiredFields.filter(f => !mappedFields.includes(f));
    
    if (missingRequired.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please map the following required fields: ${missingRequired.join(', ')}`,
        variant: 'destructive'
      });
      return false;
    }
    
    return true;
  };

  const transformDataForImport = () => {
    return csvData.map(row => {
      const transformedRow: any = {};
      fieldMappings.forEach(mapping => {
        let value = row[mapping.csvField];
        
        // Handle empty or whitespace-only values
        if (!value || value.trim() === '') {
          // For integer fields, set to null instead of empty string
          if (mapping.profileField === 'student_fte') {
            transformedRow[mapping.profileField] = null;
            return;
          }
          // For other fields, set to empty string or null as appropriate
          transformedRow[mapping.profileField] = '';
          return;
        }
        
        // Transform boolean fields - convert to actual boolean, not string
        if (mapping.profileField.startsWith('primary_office_') && mapping.profileField !== 'primary_office_other_details') {
          transformedRow[mapping.profileField] = ['yes', 'true', '1', 'x'].includes(value?.toLowerCase());
          return;
        }
        
        // Transform numeric fields
        if (mapping.profileField === 'student_fte') {
          const numValue = parseInt(value);
          if (isNaN(numValue)) {
            transformedRow[mapping.profileField] = null;
            return;
          }
          transformedRow[mapping.profileField] = numValue.toString();
          return;
        }
        
        transformedRow[mapping.profileField] = value;
      });
      return transformedRow;
    });
  };

  const handleImport = async () => {
    if (!validateMappings()) return;
    
    setImporting(true);
    setProgress(0);
    
    try {
      const transformedData = transformDataForImport();
      
      const { data, error } = await supabase.functions.invoke('import-members', {
        body: { members: transformedData }
      });
      
      if (error) {
        throw error;
      }
      
      setImportResult(data);
      setProgress(100);
      
      toast({
        title: 'Import Completed',
        description: `Successfully imported ${data.successful.length} member organizations. ${data.failed.length} failed. ${data.existing.length} already existed.`
      });
      
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'An error occurred during import',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMappings([]);
    setImportResult(null);
    setImporting(false);
    setProgress(0);
  };

  const handleClose = () => {
    resetImport();
    onOpenChange(false);
  };

  if (importResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Results</DialogTitle>
          <DialogDescription>Review the results of your member organization import</DialogDescription>
        </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Member organization import completed</p>
              <Button onClick={resetImport}>Import More Member Organizations</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Successful</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{importResult.successful.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{importResult.failed.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Already Existed</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{importResult.existing.length}</div>
                </CardContent>
              </Card>
            </div>

            {importResult.failed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Failed Imports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importResult.failed.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm">
                          <a 
                            href={`mailto:${item.email}`}
                            className="text-primary hover:underline"
                          >
                            {item.email}
                          </a>
                        </span>
                        <span className="text-xs text-red-600">{item.error}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Import Member Organizations</DialogTitle>
        <DialogDescription>Upload a CSV file to import member organization data into the system</DialogDescription>
      </DialogHeader>
        
        <div className="space-y-6">
          {csvData.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Upload a CSV file containing member organization data to import into the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-lg">Drop the CSV file here...</p>
                  ) : (
                    <div>
                      <p className="text-lg mb-2">Drag & drop a CSV file here, or click to select</p>
                      <p className="text-sm text-muted-foreground">Supports .csv files</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">CSV Loaded: {csvData.length} records</span>
                </div>
                <Button variant="outline" onClick={resetImport}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Field Mapping</CardTitle>
                  <CardDescription>
                    Map CSV columns to profile fields. Required fields must be mapped.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {csvHeaders.map(header => {
                      const mapping = fieldMappings.find(m => m.csvField === header);
                      const mappedField = profileFields.find(f => f.value === mapping?.profileField);
                      
                      return (
                        <div key={header} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">{header}</Badge>
                            <span>→</span>
                            <Select
                              value={mapping?.profileField || ''}
                              onValueChange={(value) => {
                                if (value === 'unmapped') {
                                  removeFieldMapping(header);
                                } else {
                                  updateFieldMapping(header, value);
                                }
                              }}
                            >
                              <SelectTrigger className="w-60">
                                <SelectValue placeholder="Select field to map to" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unmapped">— Unmapped —</SelectItem>
                                {profileFields.map(field => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label} {field.required && '*'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {mappedField?.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {importing && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Importing member organizations...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleImport} disabled={importing || fieldMappings.length === 0}>
                  {importing ? 'Importing...' : `Import ${csvData.length} Member Organizations`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}