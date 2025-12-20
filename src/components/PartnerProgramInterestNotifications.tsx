import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { usePartnerProgramInterests } from '@/hooks/usePartnerProgramInterests';
import { Users, Building2, MapPin, Mail, Phone, Globe, Calendar, GraduationCap, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function PartnerProgramInterestNotifications() {
  const { interests, loading, error, count } = usePartnerProgramInterests();

  if (loading) {
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

  return (
    <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Partner Program Interest Notifications
              <Badge variant="destructive" className="ml-2">
                {count} {count === 1 ? 'Member' : 'Members'}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              The following members have expressed interest in learning about your partner program
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {interests.map((interest, index) => (
            <AccordionItem 
              key={interest.organizationId} 
              value={`item-${index}`}
              className="border rounded-lg bg-background/80 px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-4 text-left w-full">
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
