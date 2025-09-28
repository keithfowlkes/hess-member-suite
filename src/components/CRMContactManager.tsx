import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Building, 
  Eye, 
  Edit, 
  MoreHorizontal,
  Download,
  Users
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  email: string;
  city: string;
  state: string;
  membership_status: string;
  student_fte: number;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export const CRMContactManager = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Organization | null>(null);
  const [contactDetailsOpen, setContactDetailsOpen] = useState(false);

  // Fetch organizations with contact details
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['crm-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          email,
          city,
          state,
          membership_status,
          student_fte,
          created_at,
          profiles:contact_person_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('name');

      if (error) throw error;
      return data as Organization[];
    },
  });

  // Filter organizations based on search and status
  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (org.profiles?.first_name + " " + org.profiles?.last_name).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || org.membership_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleExportContacts = async () => {
    try {
      const csvHeaders = "Organization Name,Contact Name,Contact Email,Phone,City,State,Status,Student FTE,Join Date\n";
      const csvRows = filteredOrganizations.map(org => 
        `"${org.name}","${org.profiles?.first_name || ''} ${org.profiles?.last_name || ''}","${org.profiles?.email || org.email || ''}","${org.profiles?.phone || ''}","${org.city || ''}","${org.state || ''}","${org.membership_status}","${org.student_fte || ''}","${new Date(org.created_at).toLocaleDateString()}"`
      ).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `crm_contacts_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({
        title: "Export Successful",
        description: `Exported ${filteredOrganizations.length} contacts to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export contacts.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary",
      inactive: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExportContacts} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export ({filteredOrganizations.length})
        </Button>
      </div>

      {/* Contact Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">{organizations.filter(o => o.membership_status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-semibold">{organizations.filter(o => o.membership_status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-lg font-semibold">{organizations.filter(o => o.profiles?.email || o.email).length}</p>
                <p className="text-sm text-muted-foreground">With Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contact Directory ({filteredOrganizations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading contacts...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Primary Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>FTE</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        {org.email && (
                          <p className="text-sm text-muted-foreground">{org.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {org.profiles?.first_name} {org.profiles?.last_name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {org.profiles?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {org.profiles.email}
                            </span>
                          )}
                          {org.profiles?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {org.profiles.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.city && org.state ? `${org.city}, ${org.state}` : org.city || org.state || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(org.membership_status)}</TableCell>
                    <TableCell>{org.student_fte || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedContact(org);
                              setContactDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Contact
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contact Details Dialog */}
      <Dialog open={contactDetailsOpen} onOpenChange={setContactDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Organization</h4>
                  <p>{selectedContact.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedContact.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Primary Contact</h4>
                  <p>{selectedContact.profiles?.first_name} {selectedContact.profiles?.last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedContact.profiles?.email}</p>
                  {selectedContact.profiles?.phone && (
                    <p className="text-sm text-muted-foreground">{selectedContact.profiles.phone}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold">Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-medium">Location:</span> {selectedContact.city}, {selectedContact.state}</p>
                  <p><span className="font-medium">Status:</span> {selectedContact.membership_status}</p>
                  <p><span className="font-medium">Student FTE:</span> {selectedContact.student_fte || 'N/A'}</p>
                  <p><span className="font-medium">Member Since:</span> {new Date(selectedContact.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};