import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Phone, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  User,
  PhoneCall
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CallLog {
  id: string;
  organization_id: string;
  contact_name: string;
  contact_email: string;
  phone_number: string;
  call_type: 'inbound' | 'outbound';
  call_status: 'completed' | 'missed' | 'voicemail' | 'busy';
  duration: number;
  notes: string;
  created_at: string;
  created_by: string;
  organization?: {
    name: string;
  };
}

export const CRMCallTracking = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [callDetailsOpen, setCallDetailsOpen] = useState(false);
  const [callDate, setCallDate] = useState<Date>();

  const [callData, setCallData] = useState({
    organization_id: '',
    contact_name: '',
    contact_email: '',
    phone_number: '',
    call_type: 'outbound' as 'inbound' | 'outbound',
    call_status: 'completed' as 'completed' | 'missed' | 'voicemail' | 'busy',
    duration: 0,
    notes: ''
  });

  // Mock call logs data - in real app, this would come from your database 
  const mockCallLogs: CallLog[] = [
    {
      id: '1',
      organization_id: '1',
      contact_name: 'John Smith',
      contact_email: 'john@university.edu',
      phone_number: '(555) 123-4567',
      call_type: 'outbound',
      call_status: 'completed',
      duration: 900, // 15 minutes
      notes: 'Discussed membership renewal and new software requirements.',
      created_at: '2024-01-15T10:30:00Z',
      created_by: 'admin',
      organization: { name: 'State University' }
    },
    {
      id: '2',
      organization_id: '2',
      contact_name: 'Sarah Johnson',
      contact_email: 'sarah@college.edu',
      phone_number: '(555) 987-6543',
      call_type: 'inbound',
      call_status: 'completed',
      duration: 1200, // 20 minutes
      notes: 'Question about invoice and payment terms.',
      created_at: '2024-01-14T14:15:00Z',
      created_by: 'admin',
      organization: { name: 'Community College' }
    },
    {
      id: '3',
      organization_id: '3',
      contact_name: 'Mike Davis',
      contact_email: 'mike@tech.edu',
      phone_number: '(555) 456-7890',
      call_type: 'outbound',
      call_status: 'voicemail',
      duration: 0,
      notes: 'Left voicemail about upcoming webinar series.',
      created_at: '2024-01-13T09:00:00Z',
      created_by: 'admin',
      organization: { name: 'Tech Institute' }
    }
  ];

  // Fetch organizations for call logging
  const { data: organizations = [] } = useQuery({
    queryKey: ['call-tracking-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          email,
          profiles:contact_person_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('membership_status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Filter call logs
  const filteredCalls = mockCallLogs.filter(call => {
    const matchesSearch = call.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         call.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         call.organization?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         call.phone_number.includes(searchTerm);
    
    const matchesType = filterType === "all" || call.call_type === filterType;
    const matchesStatus = filterStatus === "all" || call.call_status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleLogCall = async () => {
    try {
      // Validate form
      if (!callData.organization_id || !callData.contact_name || !callData.phone_number) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // In a real app, you would save this to your database
      console.log('Logging call:', { ...callData, call_date: callDate });

      toast({
        title: "Call Logged",
        description: "Call has been successfully logged to the system.",
      });

      // Reset form
      setCallData({
        organization_id: '',
        contact_name: '',
        contact_email: '',
        phone_number: '',
        call_type: 'outbound',
        call_status: 'completed',
        duration: 0,
        notes: ''
      });
      setCallDate(undefined);
      setLogCallOpen(false);

    } catch (error) {
      console.error('Call logging error:', error);
      toast({
        title: "Logging Failed",
        description: "Failed to log the call.",
        variant: "destructive",
      });
    }
  };

  const handleExportCalls = async () => {
    try {
      const csvHeaders = "Date,Organization,Contact,Phone,Type,Status,Duration,Notes\n";
      const csvRows = filteredCalls.map(call => 
        `"${new Date(call.created_at).toLocaleString()}","${call.organization?.name || ''}","${call.contact_name}","${call.phone_number}","${call.call_type}","${call.call_status}","${Math.floor(call.duration / 60)}m","${call.notes.replace(/"/g, '""')}"`
      ).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `call_logs_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({
        title: "Export Successful",
        description: `Exported ${filteredCalls.length} call records to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export call logs.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      missed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      voicemail: { variant: "secondary", icon: <AlertCircle className="h-3 w-3" /> },
      busy: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
    };
    
    const config = variants[status] || variants.completed;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getCallTypeColor = (type: string) => {
    return type === 'inbound' ? 'text-green-600' : 'text-blue-600';
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0m';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Call Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">{mockCallLogs.length}</p>
                <p className="text-sm text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-semibold">{mockCallLogs.filter(c => c.call_status === 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-lg font-semibold">{mockCallLogs.filter(c => c.call_type === 'outbound').length}</p>
                <p className="text-sm text-muted-foreground">Outbound</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-semibold">
                  {formatDuration(mockCallLogs.reduce((total, call) => total + call.duration, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search calls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="voicemail">Voicemail</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCalls} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export ({filteredCalls.length})
          </Button>
          <Dialog open={logCallOpen} onOpenChange={setLogCallOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Call
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log New Call</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Organization *</Label>
                    <Select value={callData.organization_id} onValueChange={(value) => setCallData(prev => ({ ...prev, organization_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Call Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !callDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {callDate ? format(callDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={callDate}
                          onSelect={setCallDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input
                      value={callData.contact_name}
                      onChange={(e) => setCallData(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="Enter contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input
                      value={callData.phone_number}
                      onChange={(e) => setCallData(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Call Type</Label>
                    <Select value={callData.call_type} onValueChange={(value: 'inbound' | 'outbound') => setCallData(prev => ({ ...prev, call_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outbound">Outbound</SelectItem>
                        <SelectItem value="inbound">Inbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={callData.call_status} onValueChange={(value: any) => setCallData(prev => ({ ...prev, call_status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                        <SelectItem value="voicemail">Voicemail</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={callData.duration / 60}
                      onChange={(e) => setCallData(prev => ({ ...prev, duration: parseInt(e.target.value) * 60 || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    value={callData.contact_email}
                    onChange={(e) => setCallData(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="contact@organization.edu"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Call Notes</Label>
                  <Textarea
                    value={callData.notes}
                    onChange={(e) => setCallData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter call notes and discussion points..."
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setLogCallOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLogCall}>
                  <Phone className="h-4 w-4 mr-2" />
                  Log Call
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call History ({filteredCalls.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <div className="text-sm">
                      <p>{new Date(call.created_at).toLocaleDateString()}</p>
                      <p className="text-muted-foreground">
                        {new Date(call.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{call.organization?.name}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{call.contact_name}</p>
                      <p className="text-sm text-muted-foreground">{call.phone_number}</p>
                      {call.contact_email && (
                        <p className="text-xs text-muted-foreground">{call.contact_email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getCallTypeColor(call.call_type)}>
                      {call.call_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(call.call_status)}</TableCell>
                  <TableCell>{formatDuration(call.duration)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedCall(call);
                        setCallDetailsOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Call Details Dialog */}
      <Dialog open={callDetailsOpen} onOpenChange={setCallDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Call Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Date:</span> {new Date(selectedCall.created_at).toLocaleDateString()}</p>
                    <p><span className="font-medium">Time:</span> {new Date(selectedCall.created_at).toLocaleTimeString()}</p>
                    <p><span className="font-medium">Type:</span> {selectedCall.call_type}</p>
                    <p><span className="font-medium">Duration:</span> {formatDuration(selectedCall.duration)}</p>
                    <p><span className="font-medium">Status:</span> {selectedCall.call_status}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Contact Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Organization:</span> {selectedCall.organization?.name}</p>
                    <p><span className="font-medium">Contact:</span> {selectedCall.contact_name}</p>
                    <p><span className="font-medium">Phone:</span> {selectedCall.phone_number}</p>
                    {selectedCall.contact_email && (
                      <p><span className="font-medium">Email:</span> {selectedCall.contact_email}</p>
                    )}
                  </div>
                </div>
              </div>
              {selectedCall.notes && (
                <div>
                  <h4 className="font-semibold">Call Notes</h4>
                  <p className="text-sm bg-muted p-3 rounded-md mt-2">{selectedCall.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};