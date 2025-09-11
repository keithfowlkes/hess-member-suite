import { useState } from 'react';
import { MessageSquare, Eye, EyeOff, Calendar, User, Mail, Trash2, CheckCheck } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useUserMessages, useMarkMessageAsRead, useMarkAllMessagesAsRead } from '@/hooks/useUserMessages';
import { format } from 'date-fns';

export default function UserMessages() {
  const { data: messages = [], isLoading } = useUserMessages();
  const markAsRead = useMarkMessageAsRead();
  const markAllAsRead = useMarkAllMessagesAsRead();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const unreadCount = messages.filter(msg => !msg.read_at).length;

  const handleMarkAsRead = (messageId: string) => {
    markAsRead.mutate(messageId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "All messages marked as read",
        });
      }
    });
  };

  const handleViewMessage = (message: any) => {
    setSelectedMessage(message);
    if (!message.read_at) {
      handleMarkAsRead(message.id);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading messages...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              User Messages
            </h1>
            <p className="text-muted-foreground mt-2">
              Feedback and messages from users
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {unreadCount} unread
              </Badge>
            )}
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {messages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Messages Yet</h2>
              <p className="text-muted-foreground">
                User feedback and messages will appear here when submitted.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id} className={`transition-all hover:shadow-md ${!message.read_at ? 'border-primary/50 bg-primary/5' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{message.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{message.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{format(new Date(message.created_at), 'MMM dd, yyyy hh:mm a')}</span>
                        </div>
                        {!message.read_at && (
                          <Badge variant="destructive">New</Badge>
                        )}
                      </div>
                      
                      <div className="text-foreground">
                        <p className="line-clamp-3">{message.message}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewMessage(message)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <MessageSquare className="h-5 w-5" />
                              User Message
                            </DialogTitle>
                          </DialogHeader>
                          
                          {selectedMessage && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                                  <p className="text-foreground">{selectedMessage.name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                                  <p className="text-foreground">{selectedMessage.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                                  <p className="text-foreground">{format(new Date(selectedMessage.created_at), 'PPpp')}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <Badge variant={selectedMessage.read_at ? "secondary" : "destructive"}>
                                    {selectedMessage.read_at ? "Read" : "Unread"}
                                  </Badge>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">Message</label>
                                <ScrollArea className="max-h-64 p-4 bg-muted/30 rounded-lg">
                                  <p className="text-foreground whitespace-pre-wrap">{selectedMessage.message}</p>
                                </ScrollArea>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {!message.read_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(message.id)}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}