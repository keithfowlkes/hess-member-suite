import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { usePartnerProgramInterests, PartnerProgramInterest } from '@/hooks/usePartnerProgramInterests';
import { Users, Building2, MapPin, Mail, Phone, Globe, Calendar, GraduationCap, Shield, Reply, Forward, X, Plus, Trash2, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'admin_partner_interests_viewed';

const EMAIL_SUBJECT = "HESS Cohort Program Interest Response";

// Available partner programs
const AVAILABLE_PROGRAMS = [
  'Anthology',
  'Ellucian',
  'Jenzabar',
  'Oracle',
  'Workday'
];

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

function EmailActions({ interest }: { interest: PartnerProgramInterest }) {
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
    <div className="flex gap-2 mt-4 pt-4 border-t">
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
  );
}

interface InterestEditorProps {
  interest: PartnerProgramInterest;
  onUpdate: () => void;
}

function InterestEditor({ interest, onUpdate }: InterestEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(interest.partnerProgramInterest);
  const [saving, setSaving] = useState(false);

  const handleToggleProgram = (program: string) => {
    setSelectedPrograms(prev => 
      prev.includes(program) 
        ? prev.filter(p => p !== program)
        : [...prev, program]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          partner_program_interest: selectedPrograms.length > 0 ? selectedPrograms : null 
        })
        .eq('id', interest.organizationId);

      if (error) throw error;
      
      toast.success('Partner program interests updated');
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Error updating interests:', err);
      toast.error('Failed to update interests');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInterest = async (program: string) => {
    const newInterests = interest.partnerProgramInterest.filter(p => p !== program);
    
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          partner_program_interest: newInterests.length > 0 ? newInterests : null 
        })
        .eq('id', interest.organizationId);

      if (error) throw error;
      
      toast.success(`Removed ${program} interest`);
      onUpdate();
    } catch (err) {
      console.error('Error removing interest:', err);
      toast.error('Failed to remove interest');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Interest Details
        </h4>
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Edit Program Interests</h4>
              <div className="space-y-2">
                {AVAILABLE_PROGRAMS.map(program => (
                  <div key={program} className="flex items-center space-x-2">
                    <Checkbox
                      id={`program-${interest.organizationId}-${program}`}
                      checked={selectedPrograms.includes(program)}
                      onCheckedChange={() => handleToggleProgram(program)}
                    />
                    <label 
                      htmlFor={`program-${interest.organizationId}-${program}`}
                      className="text-sm cursor-pointer"
                    >
                      {program}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setSelectedPrograms(interest.partnerProgramInterest);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {interest.partnerProgramInterest.map(program => (
            <Badge 
              key={program} 
              className="bg-amber-100 text-amber-800 border-amber-300 pr-1 flex items-center gap-1"
            >
              Interested in {program}
              <button
                onClick={() => handleDeleteInterest(program)}
                className="ml-1 p-0.5 hover:bg-amber-200 rounded transition-colors"
                title={`Remove ${program} interest`}
              >
                <X className="h-3 w-3" />
              </button>
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
  );
}

export function AdminPartnerProgramInterests() {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [accordionValue, setAccordionValue] = useState<string>('');
  // Pass true to get ALL partner program interests
  const { interests, loading, error, count } = usePartnerProgramInterests(true);

  // Mark as viewed when accordion is opened
  useEffect(() => {
    if (accordionValue === 'admin-interests' && count > 0) {
      // Store the current count as viewed
      localStorage.setItem(STORAGE_KEY, String(count));
      // Dispatch custom event to notify sidebar to update badge
      window.dispatchEvent(new CustomEvent('partnerInterestsViewed'));
    }
  }, [accordionValue, count]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // Force a re-render by updating state - the hook will refetch
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="mb-6 border border-amber-500/30 rounded-lg bg-gradient-to-r from-amber-500/5 to-amber-500/10 p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
        <Skeleton className="h-20 w-full mt-4" />
      </div>
    );
  }

  if (error || count === 0) {
    return null;
  }

  // Group interests by partner program
  const groupedByProgram: Record<string, PartnerProgramInterest[]> = {};
  interests.forEach(interest => {
    interest.partnerProgramInterest.forEach(program => {
      if (!groupedByProgram[program]) {
        groupedByProgram[program] = [];
      }
      // Avoid duplicates
      if (!groupedByProgram[program].some(i => i.organizationId === interest.organizationId)) {
        groupedByProgram[program].push(interest);
      }
    });
  });

  // Filter interests based on selected program
  const filteredInterests = selectedProgram
    ? interests.filter(interest => interest.partnerProgramInterest.includes(selectedProgram))
    : interests;

  return (
    <Accordion type="single" collapsible className="mb-6" value={accordionValue} onValueChange={setAccordionValue}>
      <AccordionItem value="admin-interests" className="border border-amber-500/30 rounded-lg bg-gradient-to-r from-amber-500/5 to-amber-500/10 shadow-md">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-left">
              <div className="text-lg font-semibold flex items-center gap-2">
                All Partner Program Interests
                <Badge variant="outline" className="ml-2 border-amber-500 text-amber-600">
                  Admin View
                </Badge>
                <Badge variant="destructive" className="ml-1">
                  {count} {count === 1 ? 'Member' : 'Members'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Complete list of all members who have expressed interest in partner programs
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-4">
          {/* Summary by Program - Clickable Filters */}
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background/60 rounded-lg border">
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

          <Accordion type="single" collapsible className="w-full space-y-2">
            {filteredInterests.map((interest, index) => (
              <AccordionItem 
                key={interest.organizationId} 
                value={`item-${index}`}
                className="border rounded-lg bg-background/80 px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-4 text-left w-full">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold">{interest.organizationName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{interest.city}, {interest.state}</span>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {interest.partnerProgramInterest.map(program => (
                        <Badge key={program} variant="secondary" className="text-xs bg-amber-100 text-amber-800">
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

                    {/* Program Interest - Now with Editor */}
                    <InterestEditor interest={interest} onUpdate={handleRefresh} />
                  </div>

                  {/* Email Actions */}
                  <EmailActions interest={interest} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
