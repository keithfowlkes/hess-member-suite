import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { usePartnerProgramInterests, PartnerProgramInterest } from '@/hooks/usePartnerProgramInterests';
import { usePartnerInterestContacts } from '@/hooks/usePartnerInterestContacts';
import { Users, Building2, MapPin, Mail, Phone, Globe, Calendar, GraduationCap, Sparkles, Reply, Forward, X, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const EMAIL_SUBJECT = "HESS Cohort Program Interest Response";

function generateEmailBody(interest: PartnerProgramInterest, isForward: boolean = false): string {
  const intro = isForward 
    ? `I'm forwarding information about a HESS member who has expressed interest in our partner program.\n\n`
    : `Thank you for your interest in learning more about our partner program.\n\n`;
  
  const orgInfo = `Organization: ${interest.organizationName}
Location: ${interest.city}, ${interest.state}
${interest.studentFte ? `Student FTE: ${interest.studentFte.toLocaleString()}` : ''}
${interest.website ? `Website: ${interest.website}` : ''}

Contact: ${interest.contactName}
${interest.contactTitle ? `Title: ${interest.contactTitle}` : ''}
Email: ${interest.contactEmail}
${interest.phone ? `Phone: ${interest.phone}` : ''}

Partner Program Interest: ${interest.partnerProgramInterest.join(', ')}
${interest.membershipStartDate ? `Member Since: ${new Date(interest.membershipStartDate).toLocaleDateString()}` : ''}`;

  return encodeURIComponent(intro + orgInfo);
}

interface EmailActionsProps {
  interest: PartnerProgramInterest;
  isContacted: boolean;
  contactedAt: string | null;
  onToggleContacted: () => void;
}

function EmailActions({ interest, isContacted, contactedAt, onToggleContacted }: EmailActionsProps) {
  const handleReply = () => {
    const body = generateEmailBody(interest, false);
    const mailtoUrl = `mailto:${interest.contactEmail}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${body}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleForward = () => {
    const body = generateEmailBody(interest, true);
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(`Fwd: ${EMAIL_SUBJECT}`)}&body=${body}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t">
      {/* Contacted Checkbox */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Checkbox 
          id={`contacted-${interest.organizationId}`}
          checked={isContacted}
          onCheckedChange={onToggleContacted}
        />
        <div className="flex flex-col">
          <label 
            htmlFor={`contacted-${interest.organizationId}`}
            className="text-sm font-medium cursor-pointer flex items-center gap-2"
          >
            {isContacted ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Contacted
              </>
            ) : (
              'Mark as contacted'
            )}
          </label>
          {isContacted && contactedAt && (
            <span className="text-xs text-muted-foreground">
              Contacted on {new Date(contactedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Email Actions */}
      <div className="flex gap-2">
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleReply}
          className="flex items-center gap-2"
        >
          <Reply className="h-4 w-4" />
          Reply to Contact
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleForward}
          className="flex items-center gap-2"
        >
          <Forward className="h-4 w-4" />
          Forward Details
        </Button>
      </div>
    </div>
  );
}

export function PartnerProgramInterestNotifications() {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [showContacted, setShowContacted] = useState<boolean>(true);
  const { interests, loading, error, count } = usePartnerProgramInterests();
  const { isContacted, getContactedAt, markAsContacted, unmarkAsContacted, loading: contactsLoading } = usePartnerInterestContacts();

  if (loading || contactsLoading) {
    return (
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || count === 0) {
    return null;
  }

  // Count contacted vs not contacted
  const contactedCount = interests.filter(interest => 
    interest.partnerProgramInterest.some(program => isContacted(interest.organizationId, program))
  ).length;
  const notContactedCount = interests.length - contactedCount;

  // Group interests by partner program
  const groupedByProgram: Record<string, PartnerProgramInterest[]> = {};
  interests.forEach(interest => {
    interest.partnerProgramInterest.forEach(program => {
      if (!groupedByProgram[program]) {
        groupedByProgram[program] = [];
      }
      if (!groupedByProgram[program].some(i => i.organizationId === interest.organizationId)) {
        groupedByProgram[program].push(interest);
      }
    });
  });

  // Filter interests based on selected program and contacted status
  let filteredInterests = selectedProgram
    ? interests.filter(interest => interest.partnerProgramInterest.includes(selectedProgram))
    : interests;

  // Further filter by contacted status if not showing all
  if (!showContacted) {
    filteredInterests = filteredInterests.filter(interest => 
      !interest.partnerProgramInterest.some(program => isContacted(interest.organizationId, program))
    );
  }

  const handleToggleContacted = async (organizationId: string, programs: string[]) => {
    // Check if any of the programs are contacted
    const anyContacted = programs.some(program => isContacted(organizationId, program));
    
    if (anyContacted) {
      // Unmark all programs for this org
      for (const program of programs) {
        if (isContacted(organizationId, program)) {
          await unmarkAsContacted(organizationId, program);
        }
      }
    } else {
      // Mark all programs for this org
      for (const program of programs) {
        await markAsContacted(organizationId, program);
      }
    }
  };

  return (
    <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              Partner Program Interest Notifications
              <Badge variant="destructive" className="ml-2">
                {notContactedCount} New
              </Badge>
              {contactedCount > 0 && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {contactedCount} Contacted
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              The following members have expressed interest in learning about your partner program
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background/60 rounded-lg border">
          {/* Show/Hide Contacted Toggle */}
          <div className="flex items-center gap-2 mr-4 pr-4 border-r">
            <Checkbox 
              id="show-contacted"
              checked={showContacted}
              onCheckedChange={(checked) => setShowContacted(checked as boolean)}
            />
            <label htmlFor="show-contacted" className="text-sm cursor-pointer">
              Show contacted
            </label>
          </div>

          {selectedProgram && (
            <Badge 
              variant="outline" 
              className="text-sm cursor-pointer hover:bg-destructive/10 border-destructive text-destructive"
              onClick={() => setSelectedProgram(null)}
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filter
            </Badge>
          )}
          {Object.entries(groupedByProgram).map(([program, orgs]) => (
            <Badge 
              key={program} 
              variant={selectedProgram === program ? "default" : "secondary"} 
              className={`text-sm cursor-pointer transition-all ${
                selectedProgram === program 
                  ? 'ring-2 ring-primary ring-offset-1' 
                  : 'hover:bg-primary/20'
              }`}
              onClick={() => setSelectedProgram(selectedProgram === program ? null : program)}
            >
              {program}: {orgs.length} {orgs.length === 1 ? 'member' : 'members'}
            </Badge>
          ))}
        </div>

        {selectedProgram && (
          <p className="text-sm text-muted-foreground mb-3">
            Showing {filteredInterests.length} {filteredInterests.length === 1 ? 'member' : 'members'} interested in <strong>{selectedProgram}</strong>
          </p>
        )}

        {filteredInterests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">All members have been contacted!</p>
            <p className="text-sm mt-1">
              {showContacted ? 'No members match your current filters.' : 'Toggle "Show contacted" to see all entries.'}
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {filteredInterests.map((interest, index) => {
              const contacted = interest.partnerProgramInterest.some(program => 
                isContacted(interest.organizationId, program)
              );
              const contactedAt = interest.partnerProgramInterest
                .map(program => getContactedAt(interest.organizationId, program))
                .find(date => date !== null) || null;

              return (
                <AccordionItem 
                  key={interest.organizationId} 
                  value={`item-${index}`}
                  className={`border rounded-lg px-4 ${
                    contacted 
                      ? 'bg-green-50/50 border-green-200' 
                      : 'bg-background/80'
                  }`}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-4 text-left w-full">
                      {contacted && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      )}
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{interest.organizationName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{interest.city}, {interest.state}</span>
                      </div>
                      <div className="ml-auto flex gap-1">
                        {interest.partnerProgramInterest.map(program => (
                          <Badge key={program} variant="secondary" className="text-xs">
                            {program}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* Contact Information */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          Contact Information
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{interest.contactName}</span>
                          </div>
                          {interest.contactTitle && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <GraduationCap className="h-4 w-4" />
                              <span>{interest.contactTitle}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`mailto:${interest.contactEmail}`} 
                              className="text-primary hover:underline"
                            >
                              {interest.contactEmail}
                            </a>
                          </div>
                          {interest.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a 
                                href={`tel:${interest.phone}`} 
                                className="text-primary hover:underline"
                              >
                                {interest.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Organization Details */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          Organization Details
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{interest.organizationName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{interest.city}, {interest.state}</span>
                          </div>
                          {interest.studentFte && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{interest.studentFte.toLocaleString()} Student FTE</span>
                            </div>
                          )}
                          {interest.website && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <a 
                                href={interest.website.startsWith('http') ? interest.website : `https://${interest.website}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate max-w-[200px]"
                              >
                                {interest.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Program Interest */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                          Interest Details
                        </h4>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {interest.partnerProgramInterest.map(program => (
                              <Badge key={program} className="bg-primary/20 text-primary border-primary/30">
                                Interested in {program}
                              </Badge>
                            ))}
                          </div>
                          {interest.membershipStartDate && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                              <Calendar className="h-4 w-4" />
                              <span>Member since {new Date(interest.membershipStartDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Email Actions with Contacted Checkbox */}
                    <EmailActions 
                      interest={interest} 
                      isContacted={contacted}
                      contactedAt={contactedAt}
                      onToggleContacted={() => handleToggleContacted(interest.organizationId, interest.partnerProgramInterest)}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
