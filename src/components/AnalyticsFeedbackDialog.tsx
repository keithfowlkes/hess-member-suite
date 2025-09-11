import { useState, useEffect } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalyticsFeedbackDialog({ open, onOpenChange }: AnalyticsFeedbackDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Pre-populate form fields when dialog opens and user is available
  useEffect(() => {
    if (open && user) {
      // Fetch user profile to get name information
      const fetchUserProfile = async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile) {
            const fullName = [profile.first_name, profile.last_name]
              .filter(Boolean)
              .join(' ') || '';
            setName(fullName);
            setEmail(profile.email || user.email || '');
          } else {
            // Fallback to user email if no profile found
            setEmail(user.email || '');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback to user email if profile fetch fails
          setEmail(user.email || '');
        }
      };

      fetchUserProfile();
    } else if (!open) {
      // Reset form when dialog closes
      setName('');
      setEmail('');
      setMessage('');
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Save to database instead of email
      const { error } = await (supabase as any)
        .from('user_messages')
        .insert([{
          user_name: name.trim(),
          user_email: email.trim(),
          message: message.trim()
        }]);

      if (error) throw error;

      toast({
        title: "Feedback Sent!",
        description: "Thank you for your feedback. We'll review your suggestions for improving the Member Analytics dashboard.",
      });

      setName('');
      setEmail('');
      setMessage('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving feedback:', err);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            What would you like to see?
          </DialogTitle>
          <DialogDescription>
            Share your feedback on what analytics you'd like to see on the Member Analytics page. Your suggestions help us improve the dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">What analytics would you like to see?</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please describe what analytics, charts, or data insights you'd like to see added to this page..."
              rows={4}
              disabled={isLoading}
            />
          </div>
          
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Sending...' : 'Send Feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}