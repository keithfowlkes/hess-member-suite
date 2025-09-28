import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  Plus, 
  Phone, 
  Mail, 
  Users, 
  MessageSquare, 
  Calendar as CalendarIcon,
  Clock,
  Edit3,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useCommunications, type Communication, type CreateCommunicationData } from '@/hooks/useCommunications';
import { cn } from '@/lib/utils';

interface OrganizationCRMTabProps {
  organizationId: string;
  organizationName: string;
}

export function OrganizationCRMTab({ organizationId, organizationName }: OrganizationCRMTabProps) {
  const { communications, isLoading, createCommunication, updateCommunication, deleteCommunication } = useCommunications(organizationId);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);
  const [formData, setFormData] = useState<CreateCommunicationData>({
    organization_id: organizationId,
    communication_type: 'email',
    notes: '',
    communication_date: new Date().toISOString(),
    follow_up_required: false,
  });
  const [communicationDate, setCommunicationDate] = useState<Date>(new Date());
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();

  const handleOpenAddDialog = () => {
    setFormData({
      organization_id: organizationId,
      communication_type: 'email',
      notes: '',
      communication_date: new Date().toISOString(),
      follow_up_required: false,
    });
    setCommunicationDate(new Date());
    setFollowUpDate(undefined);
    setEditingCommunication(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (communication: Communication) => {
    setFormData({
      organization_id: communication.organization_id,
      communication_type: communication.communication_type,
      subject: communication.subject || '',
      notes: communication.notes,
      contact_person_name: communication.contact_person_name || '',
      contact_person_email: communication.contact_person_email || '',
      contact_person_phone: communication.contact_person_phone || '',
      communication_date: communication.communication_date,
      duration_minutes: communication.duration_minutes || undefined,
      follow_up_required: communication.follow_up_required,
      follow_up_date: communication.follow_up_date || undefined,
    });
    setCommunicationDate(new Date(communication.communication_date));
    setFollowUpDate(communication.follow_up_date ? new Date(communication.follow_up_date) : undefined);
    setEditingCommunication(communication);
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    const submitData = {
      ...formData,
      communication_date: communicationDate.toISOString(),
      follow_up_date: followUpDate ? format(followUpDate, 'yyyy-MM-dd') : undefined,
    };

    if (editingCommunication) {
      await updateCommunication.mutateAsync({ id: editingCommunication.id, data: submitData });
    } else {
      await createCommunication.mutateAsync(submitData);
    }
    
    setIsAddDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this communication record?')) {
      await deleteCommunication.mutateAsync(id);
    }
  };

  const getCommunicationTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in_person': return <Users className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCommunicationTypeBadge = (type: string) => {
    const colors = {
      email: 'bg-blue-100 text-blue-800 border-blue-200',
      phone: 'bg-green-100 text-green-800 border-green-200',
      in_person: 'bg-purple-100 text-purple-800 border-purple-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    return colors[type as keyof typeof colors] || colors.other;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading communications...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Communication History</h3>
          <p className="text-sm text-muted-foreground">Track all interactions with {organizationName}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCommunication ? 'Edit Communication' : 'Add New Communication'}
              </DialogTitle>
              <DialogDescription>
                {editingCommunication 
                  ? `Update the communication record for ${organizationName}.`
                  : `Record a new communication with ${organizationName}. The organization is automatically selected.`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Communication Type</Label>
                  <Select
                    value={formData.communication_type}
                    onValueChange={(value: any) => setFormData({ ...formData, communication_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="in_person">In-Person Meeting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Communication Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !communicationDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {communicationDate ? format(communicationDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={communicationDate}
                        onSelect={(date) => date && setCommunicationDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject/Topic</Label>
                <Input
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of the communication topic"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes <span className="text-red-500">*</span></Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Detailed notes about the communication..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person Name</Label>
                  <Input
                    value={formData.contact_person_name || ''}
                    onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                    placeholder="Name of person contacted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes || ''}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Duration in minutes"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_person_email || ''}
                    onChange={(e) => setFormData({ ...formData, contact_person_email: e.target.value })}
                    placeholder="contact@organization.edu"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={formData.contact_person_phone || ''}
                    onChange={(e) => setFormData({ ...formData, contact_person_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.follow_up_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, follow_up_required: checked })}
                  />
                  <Label>Follow-up required</Label>
                </div>

                {formData.follow_up_required && (
                  <div className="space-y-2">
                    <Label>Follow-up Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !followUpDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {followUpDate ? format(followUpDate, "PPP") : <span>Pick a follow-up date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={followUpDate}
                          onSelect={setFollowUpDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!formData.notes.trim()}>
                  {editingCommunication ? 'Update' : 'Add'} Communication
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {communications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Communications Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start tracking communications with this organization to maintain a complete record of all interactions.
            </p>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Communication
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {communications.map((communication) => (
            <Card key={communication.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {getCommunicationTypeIcon(communication.communication_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getCommunicationTypeBadge(communication.communication_type)}>
                          {communication.communication_type.replace('_', ' ')}
                        </Badge>
                        {communication.follow_up_required && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Follow-up Required
                          </Badge>
                        )}
                      </div>
                      
                      {communication.subject && (
                        <h4 className="font-medium text-sm mb-1">{communication.subject}</h4>
                      )}
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {communication.notes}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{format(new Date(communication.communication_date), 'MMM d, yyyy')}</span>
                        </div>
                        
                        {communication.duration_minutes && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{communication.duration_minutes} min</span>
                          </div>
                        )}
                        
                        {communication.contact_person_name && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{communication.contact_person_name}</span>
                          </div>
                        )}
                        
                        {communication.follow_up_date && (
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3 text-orange-500" />
                            <span>Follow-up: {format(new Date(communication.follow_up_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEditDialog(communication)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(communication.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}