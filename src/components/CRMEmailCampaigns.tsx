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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Mail, 
  Send, 
  Eye, 
  Edit, 
  Plus, 
  Users, 
  Calendar,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
  Trash,
  MoreHorizontal,
  Download,
  Filter,
  Search,
  MessageSquare,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string;
  status: 'draft' | 'scheduled' | 'sent' | 'sending';
  created_at: string;
  sent_count?: number;
  open_count?: number;
  click_count?: number;
  recipients?: string[];
  scheduled_date?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string;
  created_at: string;
}

export const CRMEmailCampaigns = () => {
  const { toast } = useToast();
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("campaigns");
  
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'newsletter',
    recipientGroup: 'all_active',
    template_id: ''
  });

  const [templateData, setTemplateData] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'newsletter'
  });

  // Mock campaigns data - in real app, this would come from your database
  const campaigns: Campaign[] = [
    {
      id: '1',
      name: 'Monthly Newsletter - December',
      subject: 'HESS Consortium December Updates',
      content: 'Dear Members,\n\nWe hope this newsletter finds you well...',
      type: 'newsletter',
      status: 'sent',
      created_at: '2024-01-15T10:00:00Z',
      sent_count: 247,
      open_count: 193,
      click_count: 45,
      recipients: ['org1@university.edu', 'org2@college.edu']
    },
    {
      id: '2',
      name: 'Membership Renewal Reminder',
      subject: 'Your HESS Membership Renewal',
      content: 'Dear [ORGANIZATION_NAME],\n\nYour membership is due for renewal...',
      type: 'reminder',
      status: 'scheduled',
      created_at: '2024-01-10T14:30:00Z',
      sent_count: 0,
      open_count: 0,
      click_count: 0,
      scheduled_date: '2024-01-25T09:00:00Z'
    },
    {
      id: '3',
      name: 'Welcome New Members',
      subject: 'Welcome to HESS Consortium!',
      content: 'Welcome to the HESS Consortium family...',
      type: 'welcome',
      status: 'draft',
      created_at: '2024-01-08T09:15:00Z',
      sent_count: 0,
      open_count: 0,
      click_count: 0
    }
  ];

  // Mock email templates
  const emailTemplates: EmailTemplate[] = [
    {
      id: '1',
      name: 'Monthly Newsletter Template',
      subject: 'HESS Consortium - [MONTH] Updates',
      content: 'Dear [ORGANIZATION_NAME],\n\n[NEWSLETTER_CONTENT]\n\nBest regards,\nHESS Consortium Team',
      type: 'newsletter',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Membership Renewal Template',
      subject: 'Membership Renewal - [ORGANIZATION_NAME]',
      content: 'Dear [CONTACT_NAME],\n\nYour membership for [ORGANIZATION_NAME] is due for renewal on [RENEWAL_DATE].\n\n[RENEWAL_DETAILS]\n\nThank you,\nHESS Team',
      type: 'reminder',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      name: 'Welcome Email Template',
      subject: 'Welcome to HESS Consortium!',
      content: 'Dear [CONTACT_NAME],\n\nWelcome to the HESS Consortium! We are excited to have [ORGANIZATION_NAME] as part of our community.\n\n[WELCOME_MESSAGE]\n\nWelcome aboard!\nHESS Team',
      type: 'welcome',
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  // Fetch organizations for recipient selection
  const { data: organizations = [] } = useQuery({
    queryKey: ['campaign-recipients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          email,
          membership_status,
          profiles:contact_person_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('membership_status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const handleCreateCampaign = async () => {
    try {
      if (!templateData.name || !templateData.subject || !templateData.content) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // In a real app, save template to database
      console.log('Creating template:', templateData);

      toast({
        title: "Template Created",
        description: "Email template has been successfully created.",
      });

      setTemplateData({
        name: '',
        subject: '',
        content: '',
        type: 'newsletter'
      });
      setTemplateManagerOpen(false);

    } catch (error) {
      console.error('Template creation error:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create email template.",
        variant: "destructive",
      });
    }
  };

  const loadTemplate = (template: EmailTemplate) => {
    setCampaignData(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content,
      type: template.type,
      template_id: template.id
    }));
    toast({
      title: "Template Loaded",
      description: `Template "${template.name}" has been loaded.`,
    });
  };

  const duplicateCampaign = (campaign: Campaign) => {
    setCampaignData({
      name: `${campaign.name} (Copy)`,
      subject: campaign.subject,
      content: campaign.content,
      type: campaign.type,
      recipientGroup: 'all_active',
      template_id: ''
    });
    setCreateCampaignOpen(true);
  };

  const handleExportCampaigns = async () => {
    try {
      const csvHeaders = "Name,Subject,Type,Status,Created Date,Recipients,Open Rate,Click Rate\n";
      const csvRows = filteredCampaigns.map(campaign => 
        `"${campaign.name}","${campaign.subject}","${campaign.type}","${campaign.status}","${new Date(campaign.created_at).toLocaleDateString()}","${campaign.sent_count || 0}","${calculateOpenRate(campaign)}%","${calculateClickRate(campaign)}%"`
      ).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `email_campaigns_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({
        title: "Export Successful",
        description: `Exported ${filteredCampaigns.length} campaigns to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export campaigns.",
        variant: "destructive",
      });
    }
  };
    try {
      // Validate form
      if (!campaignData.name || !campaignData.subject || !campaignData.content) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Determine recipients based on selection
      let recipients: string[] = [];
      if (campaignData.recipientGroup === 'selected') {
        recipients = selectedRecipients;
      } else if (campaignData.recipientGroup === 'all_active') {
        recipients = organizations
          .filter(org => org.profiles?.email || org.email)
          .map(org => org.profiles?.email || org.email)
          .filter(Boolean);
      }

      if (recipients.length === 0) {
        toast({
          title: "No Recipients",
          description: "Please select at least one recipient.",
          variant: "destructive",
        });
        return;
      }

      // Prepare bulk email data
      const emailsToSend = recipients.map(email => ({
        to: email,
        subject: campaignData.subject,
        template: 'custom',
        data: {
          title: campaignData.subject,
          content: campaignData.content,
          campaign_name: campaignData.name,
          campaign_type: campaignData.type
        }
      }));

      // Send via bulk email delivery
      const { data: result, error } = await supabase.functions.invoke('bulk-email-delivery', {
        body: {
          emails: emailsToSend
        }
      });

      if (error) throw error;

      toast({
        title: "Campaign Sent",
        description: `Email campaign sent to ${recipients.length} recipients.`,
      });

      // Reset form and close dialog
      setCampaignData({
        name: '',
        subject: '',
        content: '',
        type: 'newsletter',
        recipientGroup: 'all_active',
        template_id: ''
      });
      setSelectedRecipients([]);
      setCreateCampaignOpen(false);

    } catch (error) {
      console.error('Campaign send error:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send email campaign.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      sent: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      scheduled: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      sending: { variant: "outline", icon: <Send className="h-3 w-3" /> },
      draft: { variant: "outline", icon: <Edit className="h-3 w-3" /> },
    };
    
    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const calculateOpenRate = (campaign: Campaign) => {
    if (!campaign.sent_count || campaign.sent_count === 0) return 0;
    return Math.round(((campaign.open_count || 0) / campaign.sent_count) * 100);
  };

  const calculateClickRate = (campaign: Campaign) => {
    if (!campaign.sent_count || campaign.sent_count === 0) return 0;
    return Math.round(((campaign.click_count || 0) / campaign.sent_count) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">{campaigns.length}</p>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-semibold">{campaigns.filter(c => c.status === 'sent').length}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-lg font-semibold">{campaigns.filter(c => c.status === 'scheduled').length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-semibold">{campaigns.filter(c => c.status === 'draft').length}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-lg font-semibold">{emailTemplates.length}</p>
                <p className="text-sm text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button onClick={handleExportCampaigns} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {activeTab === "campaigns" && (
              <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
            {activeTab === "templates" && (
              <Dialog open={templateManagerOpen} onOpenChange={setTemplateManagerOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
          </div>
        </div>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="content" className="space-y-4">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="recipients">Recipients</TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name *</Label>
                    <Input
                      id="campaign-name"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter campaign name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaign-type">Campaign Type</Label>
                    <Select value={campaignData.type} onValueChange={(value) => setCampaignData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="survey">Survey</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Email Subject *</Label>
                  <Input
                    id="email-subject"
                    value={campaignData.subject}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter email subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-content">Email Content *</Label>
                  <Textarea
                    id="email-content"
                    value={campaignData.content}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter email content..."
                    rows={8}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="recipients" className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipient Group</Label>
                  <Select value={campaignData.recipientGroup} onValueChange={(value) => setCampaignData(prev => ({ ...prev, recipientGroup: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_active">All Active Members ({organizations.length})</SelectItem>
                      <SelectItem value="selected">Selected Recipients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {campaignData.recipientGroup === 'selected' && (
                  <div className="space-y-2">
                    <Label>Select Recipients</Label>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                      {organizations.map((org) => (
                        <div key={org.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={org.id}
                            checked={selectedRecipients.includes(org.profiles?.email || org.email || '')}
                            onCheckedChange={(checked) => {
                              const email = org.profiles?.email || org.email || '';
                              if (checked && email) {
                                setSelectedRecipients(prev => [...prev, email]);
                              } else {
                                setSelectedRecipients(prev => prev.filter(e => e !== email));
                              }
                            }}
                          />
                          <label htmlFor={org.id} className="text-sm cursor-pointer">
                            {org.name} ({org.profiles?.email || org.email})
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedRecipients.length} recipient(s) selected
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setCreateCampaignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>
                <Send className="h-4 w-4 mr-2" />
                Send Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <TabsContent value="campaigns" className="mt-6">
          {/* Search and Filter Controls */}
          <div className="flex gap-4 items-center justify-between mb-4">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaign.type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{campaign.sent_count || 0}</TableCell>
                      <TableCell>{calculateOpenRate(campaign)}%</TableCell>
                      <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateCampaign(campaign)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emailTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline">{template.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{template.subject}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => loadTemplate(template)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Use
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog would go here but keeping response short */}
    </div>
  );
};