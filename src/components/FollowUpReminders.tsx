import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertCircle, 
  Calendar, 
  ChevronDown, 
  Mail, 
  Phone, 
  Users, 
  MessageSquare,
  Clock,
  Building2
} from 'lucide-react';
import { useFollowUpCommunications } from '@/hooks/useFollowUpCommunications';
import { format } from 'date-fns';

export function FollowUpReminders() {
  const { 
    overdue, 
    today, 
    upcoming, 
    totalCount, 
    overdueCount, 
    todayCount, 
    upcomingCount, 
    isLoading 
  } = useFollowUpCommunications();
  
  const [isExpanded, setIsExpanded] = useState(totalCount > 0);

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
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Clock className="h-5 w-5 animate-spin mr-2" />
          Loading follow-up reminders...
        </CardContent>
      </Card>
    );
  }

  if (totalCount === 0) {
    return null; // Don't show the section if there are no follow-ups
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-orange-100/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span>Communication Follow-ups</span>
                {totalCount > 0 && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    {totalCount} total
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {overdueCount} overdue
                  </Badge>
                )}
                {todayCount > 0 && (
                  <Badge className="bg-blue-600 text-white text-xs">
                    {todayCount} today
                  </Badge>
                )}
                {upcomingCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {upcomingCount} upcoming
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {overdueCount > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Overdue Follow-ups ({overdueCount})
                </h4>
                <div className="space-y-2">
                  {overdue.map((comm) => (
                    <div key={comm.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            {getCommunicationTypeIcon(comm.communication_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge className={getCommunicationTypeBadge(comm.communication_type)}>
                                {comm.communication_type.replace('_', ' ')}
                              </Badge>
                              <div className="flex items-center space-x-1 text-sm text-red-600">
                                <Calendar className="h-3 w-3" />
                                <span>Due: {format(new Date(comm.follow_up_date!), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-1">
                              <Building2 className="h-3 w-3 text-gray-500" />
                              <span className="font-medium text-sm">{comm.organizations.name}</span>
                            </div>
                            
                            {comm.subject && (
                              <h5 className="font-medium text-sm mb-1">{comm.subject}</h5>
                            )}
                            
                            <p className="text-sm text-gray-600 line-clamp-2">{comm.notes}</p>
                            
                            {comm.contact_person_name && (
                              <div className="text-xs text-gray-500 mt-1">
                                Contact: {comm.contact_person_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {todayCount > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Today's Follow-ups ({todayCount})
                </h4>
                <div className="space-y-2">
                  {today.map((comm) => (
                    <div key={comm.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            {getCommunicationTypeIcon(comm.communication_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge className={getCommunicationTypeBadge(comm.communication_type)}>
                                {comm.communication_type.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-1">
                              <Building2 className="h-3 w-3 text-gray-500" />
                              <span className="font-medium text-sm">{comm.organizations.name}</span>
                            </div>
                            
                            {comm.subject && (
                              <h5 className="font-medium text-sm mb-1">{comm.subject}</h5>
                            )}
                            
                            <p className="text-sm text-gray-600 line-clamp-2">{comm.notes}</p>
                            
                            {comm.contact_person_name && (
                              <div className="text-xs text-gray-500 mt-1">
                                Contact: {comm.contact_person_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingCount > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Upcoming Follow-ups ({upcomingCount})
                </h4>
                <div className="space-y-2">
                  {upcoming.slice(0, 5).map((comm) => (
                    <div key={comm.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            {getCommunicationTypeIcon(comm.communication_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge className={getCommunicationTypeBadge(comm.communication_type)}>
                                {comm.communication_type.replace('_', ' ')}
                              </Badge>
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <Calendar className="h-3 w-3" />
                                <span>Due: {format(new Date(comm.follow_up_date!), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-1">
                              <Building2 className="h-3 w-3 text-gray-500" />
                              <span className="font-medium text-sm">{comm.organizations.name}</span>
                            </div>
                            
                            {comm.subject && (
                              <h5 className="font-medium text-sm mb-1">{comm.subject}</h5>
                            )}
                            
                            <p className="text-sm text-gray-600 line-clamp-2">{comm.notes}</p>
                            
                            {comm.contact_person_name && (
                              <div className="text-xs text-gray-500 mt-1">
                                Contact: {comm.contact_person_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {upcomingCount > 5 && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      ... and {upcomingCount - 5} more upcoming follow-ups
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}