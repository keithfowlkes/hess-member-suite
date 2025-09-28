import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mail, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  MessageSquare
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CommunicationHistoryProps {
  limit?: number;
}

interface EmailLog {
  id: string;
  email_type: string;
  recipient: string;
  subject: string;
  success: boolean;
  sent_at: string;
  result_data?: any;
}

export const CRMCommunicationHistory = ({ limit }: CommunicationHistoryProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [emailDetailsOpen, setEmailDetailsOpen] = useState(false);

  // Fetch email logs
  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ['email-logs', limit],
    queryFn: async () => {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  // Filter email logs
  const filteredEmails = emailLogs.filter(log => {
    const matchesSearch = log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.email_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || log.email_type === filterType;
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "success" && log.success) ||
                         (filterStatus === "failed" && !log.success);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleExportHistory = async () => {
    try {
      const csvHeaders = "Date,Type,Recipient,Subject,Status,Success\n";
      const csvRows = filteredEmails.map(log => 
        `"${new Date(log.sent_at).toLocaleString()}","${log.email_type}","${log.recipient}","${log.subject}","${log.success ? 'Success' : 'Failed'}","${log.success}"`
      ).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `email_communication_history_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({
        title: "Export Successful",
        description: `Exported ${filteredEmails.length} email records to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export communication history.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"} className="flex items-center gap-1">
        {success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {success ? 'Delivered' : 'Failed'}
      </Badge>
    );
  };

  const getEmailTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      newsletter: 'bg-blue-100 text-blue-800',
      reminder: 'bg-orange-100 text-orange-800',
      welcome: 'bg-green-100 text-green-800',
      announcement: 'bg-purple-100 text-purple-800',
      invitation: 'bg-pink-100 text-pink-800',
      default: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.default;
  };

  // Compact view for overview
  if (limit) {
    return (
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : filteredEmails.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No recent communications</div>
        ) : (
          filteredEmails.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{log.subject}</p>
                  <p className="text-xs text-muted-foreground">To: {log.recipient}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(log.success)}
                <span className="text-xs text-muted-foreground">
                  {new Date(log.sent_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search communications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
              <SelectItem value="welcome">Welcome</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="invitation">Invitation</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExportHistory} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export ({filteredEmails.length})
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">{emailLogs.length}</p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-semibold">{emailLogs.filter(log => log.success).length}</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-lg font-semibold">{emailLogs.filter(log => !log.success).length}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Communications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication History ({filteredEmails.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading communication history...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(log.sent_at).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">
                          {new Date(log.sent_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEmailTypeColor(log.email_type)} variant="outline">
                        {log.email_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{log.recipient}</p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-xs truncate">{log.subject}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.success)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedEmail(log);
                          setEmailDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Email Details Dialog */}
      <Dialog open={emailDetailsOpen} onOpenChange={setEmailDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Type:</span> {selectedEmail.email_type}</p>
                    <p><span className="font-medium">Recipient:</span> {selectedEmail.recipient}</p>
                    <p><span className="font-medium">Subject:</span> {selectedEmail.subject}</p>
                    <p><span className="font-medium">Sent:</span> {new Date(selectedEmail.sent_at).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Delivery Status</h4>
                  <div className="space-y-2">
                    {getStatusBadge(selectedEmail.success)}
                    {selectedEmail.result_data && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Result Data:</p>
                        <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
                          {JSON.stringify(selectedEmail.result_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};