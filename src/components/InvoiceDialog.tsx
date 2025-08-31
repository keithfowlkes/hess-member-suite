import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useInvoices, Invoice, CreateInvoiceData } from '@/hooks/useInvoices';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/hooks/useAuth';
import { CalendarIcon, FileText, Edit, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ProfessionalInvoice } from '@/components/ProfessionalInvoice';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const invoiceSchema = z.object({
  organization_id: z.string().min(1, 'Organization is required').optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  prorated_amount: z.number().min(0).optional(),
  due_date: z.date({ required_error: 'Due date is required' }),
  period_start_date: z.date({ required_error: 'Period start date is required' }),
  period_end_date: z.date({ required_error: 'Period end date is required' }),
  notes: z.string().optional(),
});

const bulkInvoiceSchema = z.object({
  amount: z.number().min(0, 'Amount must be positive'),
  due_date: z.date({ required_error: 'Due date is required' }),
  period_start_date: z.date({ required_error: 'Period start date is required' }),
  period_end_date: z.date({ required_error: 'Period end date is required' }),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  bulkMode?: boolean;
}

export function InvoiceDialog({ open, onOpenChange, invoice, bulkMode = false }: InvoiceDialogProps) {
  const { createInvoice, createBulkInvoices, updateInvoice } = useInvoices();
  const { organizations } = useMembers();
  const { isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Function to download invoice as PDF
  const downloadPDF = async () => {
    if (!invoiceRef.current || !invoice) return;

    try {
      // Capture the invoice element as canvas
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // Center the image on the page
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      // Generate filename
      const organizationName = invoice.organizations?.name || 'Unknown';
      const fileName = `Invoice_${invoice.invoice_number}_${organizationName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      // Download the PDF
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(bulkMode ? bulkInvoiceSchema : invoiceSchema),
    defaultValues: {
      organization_id: bulkMode ? undefined : '',
      amount: 1000,
      prorated_amount: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (invoice) {
      form.reset({
        organization_id: invoice.organization_id,
        amount: invoice.amount,
        prorated_amount: invoice.prorated_amount || undefined,
        due_date: new Date(invoice.due_date),
        period_start_date: new Date(invoice.period_start_date),
        period_end_date: new Date(invoice.period_end_date),
        notes: invoice.notes || '',
      });
    } else {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      form.reset({
        organization_id: bulkMode ? undefined : '',
        amount: 1000,
        prorated_amount: undefined,
        due_date: dueDate,
        period_start_date: startOfYear,
        period_end_date: endOfYear,
        notes: '',
      });
    }
  }, [invoice, form, bulkMode]);

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      if (invoice) {
        const updateData = {
          ...data,
          due_date: data.due_date.toISOString().split('T')[0],
          period_start_date: data.period_start_date.toISOString().split('T')[0],
          period_end_date: data.period_end_date.toISOString().split('T')[0],
          notes: data.notes || null,
          prorated_amount: data.prorated_amount || null,
        };
        await updateInvoice(invoice.id, updateData);
      } else {
        if (bulkMode) {
          const bulkData = {
            amount: data.amount,
            due_date: data.due_date.toISOString().split('T')[0],
            period_start_date: data.period_start_date.toISOString().split('T')[0],
            period_end_date: data.period_end_date.toISOString().split('T')[0],
            notes: data.notes || undefined,
          };
          await createBulkInvoices(bulkData);
        } else {
          const createData: CreateInvoiceData = {
            organization_id: data.organization_id!,
            amount: data.amount,
            prorated_amount: data.prorated_amount || undefined,
            due_date: data.due_date.toISOString().split('T')[0],
            period_start_date: data.period_start_date.toISOString().split('T')[0],
            period_end_date: data.period_end_date.toISOString().split('T')[0],
            notes: data.notes || undefined,
          };
          await createInvoice(createData);
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProration = () => {
    const formData = form.getValues();
    const selectedOrg = organizations.find(org => org.id === formData.organization_id);
    
    if (!selectedOrg?.membership_start_date || !formData.period_start_date || !formData.period_end_date) {
      return;
    }

    const membershipStart = new Date(selectedOrg.membership_start_date);
    const periodStart = formData.period_start_date;
    const periodEnd = formData.period_end_date;
    
    if (membershipStart > periodStart) {
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.ceil((periodEnd.getTime() - membershipStart.getTime()) / (1000 * 60 * 60 * 24));
      const proratedAmount = Math.round((formData.amount * remainingDays / totalDays) * 100) / 100;
      
      form.setValue('prorated_amount', proratedAmount);
    } else {
      form.setValue('prorated_amount', undefined);
    }
  };

  const renderFormFields = () => (
    <>
      {bulkMode && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-medium text-sm mb-2">Bulk Invoice Creation</h3>
          <p className="text-sm text-muted-foreground">
            This will create invoices for all active member organizations. 
            Prorated amounts will be calculated automatically based on each organization's membership start date.
          </p>
        </div>
      )}

      {!bulkMode && (
        <FormField
          control={form.control}
          name="organization_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization *</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  setTimeout(calculateProration, 100);
                }} 
                defaultValue={field.value}
                disabled={!!invoice && !isAdmin}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.membership_status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className={bulkMode ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ($) *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="1000.00"
                  {...field}
                  onChange={(e) => {
                    field.onChange(parseFloat(e.target.value) || 0);
                    setTimeout(calculateProration, 100);
                  }}
                  disabled={!!invoice && !isAdmin}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!bulkMode && (
          <FormField
            control={form.control}
            name="prorated_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prorated Amount ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="Auto-calculated"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    disabled={!!invoice && !isAdmin}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <FormField
        control={form.control}
        name="due_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Due Date *</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={!!invoice && !isAdmin}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="period_start_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Period Start Date *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={!!invoice && !isAdmin}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setTimeout(calculateProration, 100);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="period_end_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Period End Date *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={!!invoice && !isAdmin}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setTimeout(calculateProration, 100);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {!bulkMode && (
        <Button 
          type="button" 
          variant="outline" 
          onClick={calculateProration}
          disabled={!!invoice}
        >
          Calculate Proration
        </Button>
      )}

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Additional notes about this invoice..." 
                {...field} 
                disabled={!!invoice && !isAdmin}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          {invoice ? 'Close' : 'Cancel'}
        </Button>
        {(!invoice || isAdmin) && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting 
              ? (invoice ? 'Updating...' : 'Creating...') 
              : invoice 
                ? 'Update Invoice' 
                : bulkMode 
                  ? 'Create Invoices for All Organizations'
                  : 'Create Invoice'
            }
          </Button>
        )}
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice 
              ? 'Invoice Details' 
              : bulkMode 
                ? 'Create Invoices for All Organizations' 
                : 'Create New Invoice'
            }
          </DialogTitle>
        </DialogHeader>

        {invoice ? (
          <Tabs defaultValue="view" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid grid-cols-2 w-fit">
                <TabsTrigger value="view" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Professional View
                </TabsTrigger>
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Details
                </TabsTrigger>
              </TabsList>
              <Button 
                onClick={downloadPDF}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
            
            <TabsContent value="view" className="mt-4">
              <div ref={invoiceRef}>
                <ProfessionalInvoice invoice={invoice} />
              </div>
            </TabsContent>
            
            <TabsContent value="edit" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {renderFormFields()}
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {renderFormFields()}
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}