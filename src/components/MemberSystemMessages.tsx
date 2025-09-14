import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Zap, Bell, X } from 'lucide-react';
import { useSystemMessages } from '@/hooks/useSystemMessages';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const MemberSystemMessages = () => {
  const { data: messages, isLoading } = useSystemMessages(true); // Only active messages
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set());

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'high': return <Zap className="h-5 w-5 text-orange-500" />;
      case 'normal': return <Info className="h-5 w-5 text-blue-500" />;
      case 'low': return <Bell className="h-5 w-5 text-gray-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent': 
        return 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white shadow-lg shadow-red-100';
      case 'high': 
        return 'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white shadow-lg shadow-orange-100';
      case 'normal': 
        return 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white shadow-lg shadow-blue-100';
      case 'low': 
        return 'border-l-4 border-l-gray-400 bg-gradient-to-r from-gray-50 to-white shadow-md';
      default: 
        return 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white shadow-lg shadow-blue-100';
    }
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white hover:bg-red-600';
      case 'high': return 'bg-orange-500 text-white hover:bg-orange-600';
      case 'normal': return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'low': return 'bg-gray-500 text-white hover:bg-gray-600';
      default: return 'bg-blue-500 text-white hover:bg-blue-600';
    }
  };

  const handleDismiss = (messageId: string) => {
    setDismissedMessages(prev => new Set([...prev, messageId]));
  };

  if (isLoading) {
    return null; // Don't show loading state to avoid layout shift
  }

  // Filter out email templates (messages with email_type) and dismissed messages
  const visibleMessages = messages?.filter(message => 
    !dismissedMessages.has(message.id) && 
    !(message as any).email_type // Only show messages without email_type (not email templates)
  ) || [];

  if (visibleMessages.length === 0) {
    return null; // Don't render anything if no messages
  }

  return (
    <div className="space-y-4 mb-6">
      {visibleMessages.map((message) => (
        <Card 
          key={message.id} 
          className={`transition-all duration-300 hover:shadow-xl ${getPriorityStyles(message.priority)}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getPriorityIcon(message.priority)}
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    {message.title}
                    <Badge className={getPriorityBadgeStyles(message.priority)}>
                      {message.priority.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Posted {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(message.id)}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {message.content}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MemberSystemMessages;