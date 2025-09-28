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
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  type: string;
  status: 'draft' | 'scheduled' | 'sent' | 'sending';
  created_at: string;
  sent_count?: number;
  open_count?: number;
  click_count?: number;
}

export const CRMEmailCampaigns = () => {
  const { toast } = useToast();
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'newsletter',
    recipientGroup: 'all_active'
  });

  // Mock campaigns data - in real app, this would come from your database
  const campaigns: Campaign[] = [
    {
      id: '1',
      name: 'Monthly Newsletter - December',
      subject: 'HESS Consortium December Updates',
      type: 'newsletter',
      status: 'sent',
      created_at: '2024-01-15T10:00:00Z',
      sent_count: 247,
      open_count: 193,
      click_count: 45
    },
    {
      id: '2',
      name: 'Membership Renewal Reminder',
      subject: 'Your HESS Membership Renewal',
      type: 'reminder',
      status: 'scheduled',
      created_at: '2024-01-10T14:30:00Z',
      sent_count: 0,
      open_count: 0,
      click_count: 0
    },
    {
      id: '3',
      name: 'Welcome New Members',
      subject: 'Welcome to HESS Consortium!',
      type: 'welcome',
      status: 'draft',
      created_at: '2024-01-08T09:15:00Z',
      sent_count: 0,
      open_count: 0,
      click_count: 0
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
        recipientGroup: 'all_active'
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Email Campaigns</h3>
        <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
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
                <TableHead>Click Rate</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{calculateOpenRate(campaign)}%</span>
                      {campaign.open_count && (
                        <span className="text-xs text-muted-foreground">({campaign.open_count})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{calculateClickRate(campaign)}%</span>
                      {campaign.click_count && (
                        <span className="text-xs text-muted-foreground">({campaign.click_count})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};