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
        <main className="flex-1 p-8 bg-gradient-to-br from-background to-muted/30">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 shadow-lg">
                    <MessageSquare className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">
                      User Messages
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Feedback and communications from your community
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-full">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                    <span className="text-destructive font-medium text-sm">
                      {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {unreadCount > 0 && (
                  <Button 
                    onClick={handleMarkAllAsRead} 
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md w-full border-0 shadow-2xl bg-gradient-to-br from-card to-muted/50">
                  <CardContent className="py-16 text-center space-y-6">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center">
                      <MessageSquare className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold text-foreground">No Messages Yet</h2>
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        User feedback and messages will appear here when submitted through the system.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid gap-4">
                {messages.map((message) => (
                  <Card 
                    key={message.id} 
                    className={`group transition-all duration-300 cursor-pointer border-0 shadow-lg hover:shadow-xl animate-fade-in ${
                      !message.is_read 
                        ? 'bg-gradient-to-r from-primary/5 via-card to-accent/5 border-l-4 border-l-primary shadow-primary/20' 
                        : 'bg-gradient-to-r from-card to-muted/30 hover:from-muted/20 hover:to-muted/40'
                    }`}
                  >
                    <CardContent className="p-6" onClick={() => handleViewMessage(message)}>
                      <div className="grid grid-cols-12 gap-6 items-center">
                        {/* User Avatar & Info */}
                        <div className="col-span-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                              !message.is_read 
                                ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg' 
                                : 'bg-gradient-to-br from-muted to-muted/60 text-muted-foreground'
                            }`}>
                              {message.user_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground text-sm truncate">{message.user_name}</span>
                                {!message.is_read && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground text-xs rounded-full shadow-lg">
                                    <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></div>
                                    <span className="font-medium">New</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5 ml-13">
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
                        </div>
                        
                        {/* Message Content */}
                        <div className="col-span-6 px-4">
                          <div className="space-y-2">
                            <p className="text-sm text-foreground line-clamp-2 leading-relaxed font-medium">
                              {message.message}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(message.created_at), 'MMM dd, yyyy • hh:mm a')}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="col-span-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReplyToMessage(message.user_email)}
                            title="Reply via email"
                            className="h-9 w-9 p-0 hover:bg-accent/20 hover:text-accent-foreground transition-colors duration-200 opacity-60 group-hover:opacity-100"
                          >
                            <Reply className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMessage(message.id)}
                            title="Delete message"
                            className="h-9 w-9 p-0 hover:bg-destructive/20 hover:text-destructive transition-colors duration-200 opacity-60 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          
                          {!message.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(message.id)}
                              title="Mark as read"
                              className="h-9 w-9 p-0 hover:bg-primary/20 hover:text-primary transition-colors duration-200"
                            >
                              <CheckCheck className="h-4 w-4" />
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
        </main>
      </div>
      
      {/* Message View Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl border-0 shadow-2xl bg-gradient-to-br from-card to-muted/20">
          <DialogHeader className="pb-6 border-b border-border/50">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/30">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              Message Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-2 gap-6">
                <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/10 shadow-lg">
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sender</label>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-sm font-semibold">
                          {selectedMessage.user_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">{selectedMessage.user_name}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedMessage.user_email}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/10 shadow-lg">
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Organization</label>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedMessage.organization || 'Not specified'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground text-sm">{format(new Date(selectedMessage.created_at), 'PPpp')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Message Content</h3>
                <Badge 
                  variant={selectedMessage.is_read ? "secondary" : "destructive"} 
                  className={`${!selectedMessage.is_read ? 'bg-gradient-to-r from-destructive to-destructive/80 shadow-lg' : ''}`}
                >
                  {selectedMessage.is_read ? "Read" : "Unread"}
                </Badge>
              </div>
              
              <Card className="border-0 bg-gradient-to-br from-muted/20 to-background shadow-inner">
                <CardContent className="p-6">
                  <ScrollArea className="max-h-64">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{selectedMessage.message}</p>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Button 
                  onClick={() => handleReplyToMessage(selectedMessage.user_email)}
                  className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
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
                  className="flex items-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200"
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