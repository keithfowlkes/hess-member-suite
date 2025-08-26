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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

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
  { value: 'primary_office_apple', label: 'Primary Office - Apple' },
  { value: 'primary_office_asus', label: 'Primary Office - ASUS' },
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

export default function ImportMembers() {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
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
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase().replace(/\s+/g, '_');
          const matchingField = profileFields.find(field => 
            field.value === lowerHeader || 
            field.label.toLowerCase().replace(/\s+/g, '_') === lowerHeader ||
            (lowerHeader.includes('first') && lowerHeader.includes('name') && field.value === 'first_name') ||
            (lowerHeader.includes('last') && lowerHeader.includes('name') && field.value === 'last_name') ||
            (lowerHeader === 'email' && field.value === 'email')
          );
          
          if (matchingField) {
            autoMappings.push({
              csvField: header,
              profileField: matchingField.value
            });
          }
        });
        
        setFieldMappings(autoMappings);
        toast({
          title: 'CSV Loaded',
          description: `Loaded ${data.length} records with ${autoMappings.length} auto-mapped fields`
        });
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
          m.csvField === csvField ? { ...m, profileField } : m
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
    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field));
    
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
      const transformed: any = {};
      
      fieldMappings.forEach(mapping => {
        const value = row[mapping.csvField];
        if (value !== undefined && value !== '') {
          // Handle boolean fields
          if (mapping.profileField.startsWith('primary_office_')) {
            transformed[mapping.profileField] = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
          }
          // Handle numeric fields
          else if (mapping.profileField === 'student_fte') {
            const numValue = parseInt(value);
            if (!isNaN(numValue)) {
              transformed[mapping.profileField] = numValue;
            }
          }
          // Handle string fields
          else {
            transformed[mapping.profileField] = value;
          }
        }
      });
      
      return transformed;
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
        description: `Successfully imported ${data.successful.length} members. ${data.failed.length} failed. ${data.existing.length} already existed.`
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
    setProgress(0);
  };

  if (importResult) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Import Results</h1>
                  <p className="text-muted-foreground">Member import completed</p>
                </div>
                <Button onClick={resetImport}>Import More Members</Button>
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
                    <Users className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{importResult.existing.length}</div>
                  </CardContent>
                </Card>
              </div>

              {importResult.failed.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Failed Imports</CardTitle>
                    <CardDescription>The following records failed to import</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.failed.map((failed, index) => (
                          <TableRow key={index}>
                            <TableCell>{failed.email}</TableCell>
                            <TableCell className="text-red-600">{failed.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Import Members</h1>
              <p className="text-muted-foreground">Upload and import member data from CSV files</p>
            </div>

            {csvData.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Upload CSV File</CardTitle>
                  <CardDescription>
                    Upload a CSV file containing member information. The file should include columns for first name, last name, and email at minimum.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    {isDragActive ? (
                      <p>Drop the CSV file here...</p>
                    ) : (
                      <>
                        <p className="text-lg font-medium mb-2">Drag & drop a CSV file here</p>
                        <p className="text-muted-foreground mb-4">or click to select a file</p>
                        <Button variant="secondary">Select File</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">CSV Data Loaded</span>
                    <Badge variant="secondary">{csvData.length} records</Badge>
                  </div>
                  <Button variant="outline" onClick={resetImport}>Upload Different File</Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Field Mapping</CardTitle>
                    <CardDescription>
                      Map your CSV columns to member profile fields. Required fields are marked with an asterisk.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {csvHeaders.map(header => {
                        const mapping = fieldMappings.find(m => m.csvField === header);
                        return (
                          <div key={header} className="flex items-center gap-4">
                            <div className="flex-1">
                              <label className="text-sm font-medium">{header}</label>
                              <div className="text-xs text-muted-foreground">
                                Sample: {csvData[0]?.[header] || 'No data'}
                              </div>
                            </div>
                            <div className="flex-1">
                              <Select
                                value={mapping?.profileField || ''}
                                onValueChange={(value) => {
                                  if (value === 'none') {
                                    removeFieldMapping(header);
                                  } else {
                                    updateFieldMapping(header, value);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select field..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Don't import</SelectItem>
                                  {profileFields.map(field => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}{field.required && ' *'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>Preview of the first few records to be imported</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {fieldMappings.map(mapping => {
                              const field = profileFields.find(f => f.value === mapping.profileField);
                              return (
                                <TableHead key={mapping.profileField}>
                                  {field?.label}{field?.required && ' *'}
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        {csvData.slice(0, 3).map((row, index) => (
                            <TableRow key={`preview-${index}`}>
                              {fieldMappings.map(mapping => (
                                <TableCell key={`${index}-${mapping.profileField}`}>
                                  {row[mapping.csvField] || '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {importing && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Importing members...</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={resetImport}>Cancel</Button>
                  <Button onClick={handleImport} disabled={importing || fieldMappings.length === 0}>
                    {importing ? 'Importing...' : `Import ${csvData.length} Members`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}