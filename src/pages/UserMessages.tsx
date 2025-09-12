import { useState } from 'react';
import { MessageSquare, Calendar, User, Mail, Trash2, CheckCheck, Reply, Building2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useUserMessages, useMarkMessageAsRead, useMarkAllMessagesAsRead, useDeleteUserMessage } from '@/hooks/useUserMessages';
import { format } from 'date-fns';

export default function UserMessages() {
  const { data: messages = [], isLoading } = useUserMessages();
  const markAsRead = useMarkMessageAsRead();
  const markAllAsRead = useMarkAllMessagesAsRead();
  const deleteMessage = useDeleteUserMessage();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const unreadCount = messages.filter(msg => !msg.is_read).length;

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
    setIsDialogOpen(true);
    if (!message.is_read) {
      handleMarkAsRead(message.id);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage.mutate(messageId);
    }
  };

  const handleReplyToMessage = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <MessageSquare className="h-8 w-8" />
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
              <div className="grid gap-3">
                {messages.map((message) => (
                  <Card key={message.id} className={`transition-all hover:shadow-md cursor-pointer animate-fade-in ${!message.is_read ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <CardContent className="p-4" onClick={() => handleViewMessage(message)}>
                      <div className="grid grid-cols-12 gap-4 items-start">
                        {/* User Info & Status */}
                        <div className="col-span-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-foreground text-sm truncate">{message.user_name}</span>
                            {!message.is_read && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0">New</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{message.user_email}</span>
                          </div>
                          {message.organization && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{message.organization}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Message Content */}
                        <div className="col-span-6">
                          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{message.message}</p>
                        </div>
                        
                        {/* Date & Actions */}
                        <div className="col-span-3 flex items-start justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(message.created_at), 'MMM dd')}</span>
                          </div>
                          
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReplyToMessage(message.user_email)}
                              title="Reply via email"
                              className="h-7 w-7 p-0 hover:bg-accent"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMessage(message.id)}
                              title="Delete message"
                              className="h-7 w-7 p-0 hover:bg-accent"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            
                            {!message.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(message.id)}
                                title="Mark as read"
                                className="h-7 w-7 p-0 hover:bg-accent"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Message View Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  <p className="text-foreground">{selectedMessage.user_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground">{selectedMessage.user_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Organization</label>
                  <p className="text-foreground">{selectedMessage.organization || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                  <p className="text-foreground">{format(new Date(selectedMessage.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={selectedMessage.is_read ? "secondary" : "destructive"}>
                    {selectedMessage.is_read ? "Read" : "Unread"}
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
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleReplyToMessage(selectedMessage.user_email)}
                  className="flex items-center gap-2"
                >
                  <Reply className="h-4 w-4" />
                  Reply via Email
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    handleDeleteMessage(selectedMessage.id);
                    setIsDialogOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}