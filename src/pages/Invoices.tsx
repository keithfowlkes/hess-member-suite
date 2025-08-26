import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Search, FileText, Send, DollarSign, Calendar, Building2, Eye } from 'lucide-react';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import { format } from 'date-fns';

export default function Invoices() {
  const { invoices, loading, markAsPaid, sendInvoice } = useInvoices();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.organizations?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  {isAdmin ? 'Invoices' : 'My Invoices'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isAdmin 
                    ? 'Manage member invoices and billing' 
                    : 'View your organization\'s invoices and payment status'}
                </p>
              </div>
              {isAdmin && (
                <Button onClick={() => {
                  setSelectedInvoice(null);
                  setDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              )}
            </div>

            {/* Search and Filters */}
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
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setDialogOpen(true);
                  }}
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
                        
                        {isAdmin && (
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoice(invoice);
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
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
                    ? "Try adjusting your search or create a new invoice." 
                    : "No invoices have been generated for your organization yet."}
                </p>
              </div>
            )}
          </div>

          <InvoiceDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            invoice={selectedInvoice}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}