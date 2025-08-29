import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Search, FileText, Send, DollarSign, Calendar, Building2, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

export default function Invoices() {
  const { invoices, loading, markAsPaid, sendInvoice } = useInvoices();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter invoices based on user role
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.organizations?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Members can only see their own invoices
    if (!isAdmin) {
      // Add user organization filtering logic here if needed
      return matchesSearch;
    }
    
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'sent': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'overdue': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'cancelled': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      case 'draft': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const handleMarkAsPaid = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsPaid(invoiceId);
  };

  const handleSendInvoice = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await sendInvoice(invoiceId);
  };

  const generatePDF = async (invoice: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Create PDF directly using jsPDF with invoice data
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set up fonts and colors
      pdf.setFont('helvetica');
      
      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text('INVOICE', 20, 30);
      
      pdf.setFontSize(12);
      pdf.setTextColor(102, 102, 102);
      pdf.text(invoice.invoice_number, 20, 40);
      
      // Invoice details
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      // Bill To section
      let yPos = 60;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bill To:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
      pdf.text(invoice.organizations?.name || '', 20, yPos);
      yPos += 6;
      pdf.text(invoice.organizations?.email || '', 20, yPos);
      
      // Invoice Details section
      yPos = 60;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice Details:', 120, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
      pdf.text(`Invoice Date: ${format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}`, 120, yPos);
      yPos += 6;
      pdf.text(`Due Date: ${format(new Date(invoice.due_date), 'MMM dd, yyyy')}`, 120, yPos);
      yPos += 6;
      pdf.text(`Period: ${format(new Date(invoice.period_start_date), 'MMM dd, yyyy')} - ${format(new Date(invoice.period_end_date), 'MMM dd, yyyy')}`, 120, yPos);
      
      // Table header
      yPos = 100;
      pdf.setFillColor(107, 114, 128);
      pdf.rect(20, yPos - 5, 170, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description', 25, yPos);
      pdf.text('Period', 100, yPos);
      pdf.text('Amount', 160, yPos);
      
      // Table content
      yPos += 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Annual Membership Fee', 25, yPos);
      if (invoice.prorated_amount) {
        pdf.text('Prorated from membership start date', 25, yPos + 5);
      }
      pdf.text(`${format(new Date(invoice.period_start_date), 'MMM dd, yyyy')} - ${format(new Date(invoice.period_end_date), 'MMM dd, yyyy')}`, 100, yPos);
      
      const amount = invoice.prorated_amount || invoice.amount;
      pdf.text(`$${amount.toLocaleString()}`, 160, yPos);
      
      if (invoice.prorated_amount) {
        pdf.setTextColor(128, 128, 128);
        pdf.text(`$${invoice.amount.toLocaleString()}`, 160, yPos + 5);
        // Add strikethrough line
        pdf.line(155, yPos + 3, 175, yPos + 3);
      }
      
      // Total
      yPos += 20;
      pdf.setFillColor(248, 250, 252);
      pdf.rect(20, yPos - 5, 170, 10, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Due:', 25, yPos);
      pdf.text(`$${amount.toLocaleString()}`, 160, yPos);
      
      // Notes
      if (invoice.notes) {
        yPos += 25;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notes:', 20, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
        const splitNotes = pdf.splitTextToSize(invoice.notes, 170);
        pdf.text(splitNotes, 20, yPos);
      }
      
      // Footer
      yPos = 260;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Thank you for your business!', 20, yPos);
      pdf.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, 120, yPos);
      
      // Download the PDF
      pdf.save(`${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback: open print dialog
      window.print();
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isAdmin ? 'All Invoices' : 'My Invoices'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isAdmin 
                    ? 'View and manage all invoices. Use Membership Fees page for full invoice management.' 
                    : 'View your organization\'s invoices and payment status'}
                </p>
              </div>
              {isAdmin && (
                <Button 
                  onClick={() => window.location.href = '/membership-fees'}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Invoices
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <Card 
                  key={invoice.id} 
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            {invoice.organizations && (
                              <div className="flex items-center">
                                <Building2 className="h-4 w-4 mr-1" />
                                {invoice.organizations.name}
                              </div>
                            )}
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center text-2xl font-bold">
                            <DollarSign className="h-5 w-5" />
                            {invoice.prorated_amount ? invoice.prorated_amount.toLocaleString() : invoice.amount.toLocaleString()}
                          </div>
                          {invoice.prorated_amount && (
                            <div className="text-sm text-muted-foreground line-through">
                              ${invoice.amount.toLocaleString()}
                            </div>
                          )}
                        </div>
                        
                        {isAdmin ? (
                          <div className="flex space-x-2">
                            {invoice.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleSendInvoice(invoice.id, e)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Send
                              </Button>
                            )}
                            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                              <Button
                                size="sm"
                                onClick={(e) => handleMarkAsPaid(invoice.id, e)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => generatePDF(invoice, e)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Print PDF
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {invoice.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredInvoices.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No invoices found</h3>
                <p className="text-muted-foreground">
                  {isAdmin 
                    ? "No invoices match your search criteria." 
                    : "No invoices have been generated for your organization yet."}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}