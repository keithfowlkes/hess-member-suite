import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

interface CSVRow {
  [key: string]: string;
}

interface RestoreResult {
  successful: string[];
  failed: { name: string; error: string }[];
  notFound: string[];
}

interface RestoreOrganizationDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestoreOrganizationDataDialog({ open, onOpenChange }: RestoreOrganizationDataDialogProps) {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const transformCSVToRestoreData = (data: CSVRow[]) => {
    return data.map(row => {
      const isPrivateNonProfit = row['We are a private, non-profit institution: Yes, we are a private, non-profit institution of higher education']?.toLowerCase() === 'checked';
      
      return {
        organization_name: row['Your college or university']?.trim(),
        state_association: row['State Association (if applicable)'] || null,
        student_fte: row['Student FTE'] ? parseInt(row['Student FTE']) : null,
        address: row['Institutional Mailing Address'] || null,
        city: row['City'] || null,
        state: row['State (two letter abbrev)'] || null,
        zip: row['Zip Code'] || null,
        primary_first_name: row['First Name- Primary Contact'] || null,
        primary_last_name: row['Last Name- Primary Contact'] || null,
        primary_contact_title: row['Primary Contact Title'] || null,
        primary_email: row['Primary Email'] || null,
        secondary_first_name: row['First Name- Secondary Contact'] || null,
        secondary_last_name: row['Last Name- Secondary Contact'] || null,
        secondary_contact_title: row['Secondary Contact Title'] || null,
        secondary_contact_email: row['Secondary Contact Email'] || null,
        secondary_contact_phone: row['Secondary Contact Phone'] || null,
        student_information_system: row['Student Information System'] || null,
        financial_system: row['Financial System'] || null,
        financial_aid: row['Financial Aid'] || null,
        hcm_hr: row['HCM (HR)'] || null,
        payroll_system: row['Payroll system'] || null,
        purchasing_system: row['Purchasing system'] || null,
        housing_management: row['Housing Management'] || null,
        learning_management: row['Learning Management (LMS)'] || null,
        admissions_crm: row['Admissions CRM'] || null,
        alumni_advancement_crm: row['Alumni / Advancement CRM'] || null,
        primary_office_apple: row['Primary Office Computers: Apple']?.toLowerCase().trim() !== '',
        primary_office_asus: false, // ASUS not in the CSV, but Lenovo is
        primary_office_dell: row['Primary Office Computers: Dell']?.toLowerCase().trim() !== '',
        primary_office_hp: row['Primary Office Computers: HP']?.toLowerCase().trim() !== '',
        primary_office_microsoft: false,
        primary_office_other: row['Primary Office Computers: Other']?.toLowerCase().trim() !== '',
        primary_office_other_details: row['Other Office Computer Vendor?'] || null,
        other_software_comments: row['If you answered other above, please share other software and any comments on your operation?'] || null,
      };
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
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
        setCsvData(data);
        setRestoreResult(null);
        
        toast({
          title: 'CSV Loaded',
          description: `Found ${data.length} organizations to restore`
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

  const handleRestore = async () => {
    if (csvData.length === 0) return;
    
    setRestoring(true);
    setProgress(0);
    
    try {
      const transformedData = transformCSVToRestoreData(csvData);
      
      const { data, error } = await supabase.functions.invoke('restore-organization-data', {
        body: { organizations: transformedData }
      });
      
      if (error) {
        throw error;
      }
      
      setRestoreResult(data);
      setProgress(100);
      
      toast({
        title: 'Restoration Completed',
        description: `Successfully restored ${data.successful.length} organizations. ${data.failed.length} failed. ${data.notFound.length} not found.`
      });
      
    } catch (error: any) {
      toast({
        title: 'Restoration Failed',
        description: error.message || 'An error occurred during restoration',
        variant: 'destructive'
      });
    } finally {
      setRestoring(false);
    }
  };

  const resetRestore = () => {
    setCsvData([]);
    setRestoreResult(null);
    setRestoring(false);
    setProgress(0);
  };

  const handleClose = () => {
    resetRestore();
    onOpenChange(false);
  };

  if (restoreResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Restoration Results</DialogTitle>
            <DialogDescription>Review the results of your organization data restoration</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Organization data restoration completed</p>
              <Button onClick={resetRestore}>Restore More Data</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Successful</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{restoreResult.successful.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{restoreResult.failed.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Not Found</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{restoreResult.notFound.length}</div>
                </CardContent>
              </Card>
            </div>

            {restoreResult.failed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Failed Restorations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {restoreResult.failed.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-xs text-red-600">{item.error}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {restoreResult.notFound.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-600">Organizations Not Found</CardTitle>
                  <CardDescription>These organizations exist in the CSV but not in the database</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {restoreResult.notFound.map((name, index) => (
                      <div key={index} className="text-sm p-2 bg-yellow-50 rounded">
                        {name}
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
          <DialogTitle>Restore Organization Data</DialogTitle>
          <DialogDescription>Upload the backup CSV file to restore organization data</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {csvData.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Upload Backup CSV File</CardTitle>
                <CardDescription>
                  Upload the HESS membership form CSV backup to restore organization data
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
                      <p className="text-lg mb-2">Drag & drop the backup CSV file here, or click to select</p>
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
                  <span className="font-medium">CSV Loaded: {csvData.length} organizations</span>
                </div>
                <Button variant="outline" onClick={resetRestore}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>

              {restoring && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Restoring organization data...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleClose} disabled={restoring}>
                  Cancel
                </Button>
                <Button onClick={handleRestore} disabled={restoring}>
                  {restoring ? 'Restoring...' : 'Restore Organization Data'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
