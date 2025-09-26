import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Plus, Mail, Bell } from 'lucide-react';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';

export function RegistrationNotificationsManager() {
  const { toast } = useToast();
  const { data: notificationEmailsSetting } = useSystemSetting('notification_emails');
  const updateSystemSetting = useUpdateSystemSetting();
  
  const [newEmail, setNewEmail] = useState('');
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (notificationEmailsSetting?.setting_value) {
      try {
        const emails = JSON.parse(notificationEmailsSetting.setting_value);
        setNotificationEmails(Array.isArray(emails) ? emails : []);
      } catch (error) {
        setNotificationEmails([]);
      }
    }
  }, [notificationEmailsSetting]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address.',
        variant: 'destructive'
      });
      return;
    }

    if (!validateEmail(newEmail.trim())) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    const email = newEmail.trim().toLowerCase();
    if (notificationEmails.includes(email)) {
      toast({
        title: 'Error',
        description: 'This email address is already in the notification list.',
        variant: 'destructive'
      });
      return;
    }

    const updatedEmails = [...notificationEmails, email];
    await updateNotificationEmails(updatedEmails);
    setNewEmail('');
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    const updatedEmails = notificationEmails.filter(email => email !== emailToRemove);
    await updateNotificationEmails(updatedEmails);
  };

  const updateNotificationEmails = async (emails: string[]) => {
    setLoading(true);
    try {
      await updateSystemSetting.mutateAsync({
        settingKey: 'notification_emails',
        settingValue: JSON.stringify(emails),
        description: 'Email addresses to notify when new registrations or updates are pending review'
      });
      
      setNotificationEmails(emails);
      toast({
        title: 'Success',
        description: 'Notification emails updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update notification emails.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (notificationEmails.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please add at least one email address before testing.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-notification', {
        body: {
          type: 'test',
          message: 'This is a test notification from the HESS Consortium registration notification system.',
          recipients: notificationEmails
        }
      });

      if (error) throw error;

      toast({
        title: 'Test Sent',
        description: `Test notification sent to ${notificationEmails.length} recipient(s).`,
      });
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to send test notification.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Registration Notifications
          </CardTitle>
          <CardDescription>
            Manage email addresses that will receive notifications when new member registrations 
            or profile updates are submitted and waiting for admin review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Email */}
          <div className="space-y-2">
            <Label htmlFor="newEmail">Add Notification Email</Label>
            <div className="flex gap-2">
              <Input
                id="newEmail"
                type="email"
                placeholder="admin@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
              />
              <Button 
                onClick={handleAddEmail} 
                disabled={loading}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Current Email List */}
          <div className="space-y-2">
            <Label>Current Notification Recipients ({notificationEmails.length})</Label>
            {notificationEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notification emails configured. Add email addresses above to receive alerts.
              </p>
            ) : (
              <div className="space-y-2">
                {notificationEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">{email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEmail(email)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test Notifications */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Test Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send a test notification to all configured recipients.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={loading || notificationEmails.length === 0}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Triggers</CardTitle>
          <CardDescription>
            Automatic notifications are sent for the following events:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">New Registration</Badge>
              <span className="text-sm">When a new member registration is submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Profile Update</Badge>
              <span className="text-sm">When an existing member submits profile/organization updates</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Contact Transfer</Badge>
              <span className="text-sm">When an organization contact transfer is requested</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}