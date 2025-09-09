import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function AdminPasswordManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [changeEmail, setChangeEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fixEmail, setFixEmail] = useState('');
  const { toast } = useToast();

  const handleSendPasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { 
          email: resetEmail
          // Let the edge function use the system setting for redirect URL
        }
      });

      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: `Password reset email sent to ${resetEmail}`,
      });
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!changeEmail || !newPassword) {
      toast({
        title: "All fields required",
        description: "Please enter both email and new password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('change-user-password', {
        body: { 
          userEmail: changeEmail,
          newPassword 
        }
      });

      if (error) throw error;

      toast({
        title: "Password changed",
        description: `Password updated for ${changeEmail}`,
      });
      setChangeEmail('');
      setNewPassword('');
    } catch (error: any) {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixRegistrationPassword = async () => {
    if (!fixEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('fix-registration-password', {
        body: { email: fixEmail }
      });

      if (error) throw error;

      toast({
        title: "Password fixed",
        description: `Password restored from registration for ${fixEmail}. They can now login with their original password.`,
      });
      setFixEmail('');
    } catch (error: any) {
      toast({
        title: "Failed to fix password",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="reset" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reset">Send Reset Email</TabsTrigger>
            <TabsTrigger value="change">Change Password</TabsTrigger>
            <TabsTrigger value="fix">Fix Registration Password</TabsTrigger>
          </TabsList>
          
          <TabsContent value="reset" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">User Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="user@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleSendPasswordReset} disabled={isLoading}>
              Send Password Reset Email
            </Button>
          </TabsContent>
          
          <TabsContent value="change" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="change-email">User Email</Label>
              <Input
                id="change-email"
                type="email"
                placeholder="user@example.com"
                value={changeEmail}
                onChange={(e) => setChangeEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={isLoading}>
              Change Password
            </Button>
          </TabsContent>
          
          <TabsContent value="fix" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fix-email">User Email</Label>
              <Input
                id="fix-email"
                type="email"
                placeholder="user@example.com"
                value={fixEmail}
                onChange={(e) => setFixEmail(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              This will restore the password they entered during registration. Use this when a user can't login after their registration was approved.
            </div>
            <Button onClick={handleFixRegistrationPassword} disabled={isLoading}>
              Fix Registration Password
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}