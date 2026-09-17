import { useState } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Building2,
  Download,
  ExternalLink,
  FileText,
  Gift,
  GraduationCap,
  Lock,
  Mail,
  Phone,
  Star,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  getPartnerFileUrl,
  useBusinessPartner,
  usePartnerContacts,
  usePartnerFiles,
  usePartnerReferenceSummary,
} from '@/hooks/useBusinessPartners';
import { PartnerLevelBadge } from './PartnerLevelBadge';
import { usePartnershipLevels } from '@/hooks/usePartnershipLevels';

const sanitize = (html: string) =>
  DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel', 'class', 'style'] });

function SignInPrompt({ what }: { what: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center space-y-3">
        <Lock className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sign in with your HESS member account to view {what}.
        </p>
        <Button asChild size="sm">
          <Link to="/auth">Member sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function PartnerMicrosite({
  slug,
  basePath = '/partners',
}: {
  slug: string;
  basePath?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: partner, isLoading } = useBusinessPartner(slug);
  const { data: levels = [] } = usePartnershipLevels();
  const level = levels.find((l) => l.id === partner?.partnership_level_id);
  const highlighted = !!level?.is_highlighted;
  const { data: contacts = [] } = usePartnerContacts(partner?.id);
  const { data: files = [] } = usePartnerFiles(partner?.id);
  const { data: referenceSummary } = usePartnerReferenceSummary(partner?.id);
  const referencesText = referenceSummary?.summary?.trim() ?? '';
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (id: string, filePath: string) => {
    setDownloading(id);
    try {
      const url = await getPartnerFileUrl(filePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      toast({
        title: 'Download unavailable',
        description: error?.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return <div className="h-64 rounded-lg bg-muted/50 animate-pulse" />;
  }

  if (!partner) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">This business partner page is not available.</p>
          <Button asChild variant="outline">
            <Link to={basePath}>Back to Business Partners</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={basePath}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          All Business Partners
        </Link>
      </Button>

      <Card
        className={`overflow-hidden ${highlighted ? 'ring-2 ring-primary/60 border-primary/40 shadow-md' : ''}`}
      >
        {highlighted && (
          <div className="flex items-center justify-center gap-1.5 bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
            <Star className="h-3.5 w-3.5 fill-current" />
            HESS {level?.name}
          </div>
        )}
        {partner.banner_url && (
          <div className="h-40 sm:h-56 w-full overflow-hidden bg-muted">
            <img src={partner.banner_url} alt={`${partner.name} banner`} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="h-24 w-36 shrink-0 rounded-md border border-border bg-card flex items-center justify-center overflow-hidden">
              {partner.logo_url ? (
                <img src={partner.logo_url} alt={`${partner.name} logo`} className="max-h-20 max-w-[85%] object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{partner.name}</h1>
                <PartnerLevelBadge levelId={partner.partnership_level_id} />
              </div>
              {partner.short_description && (
                <p className="text-muted-foreground">{partner.short_description}</p>
              )}
              {partner.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {partner.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="font-normal">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {partner.website_url && (
              <Button asChild variant="outline" className="shrink-0">
                <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit website
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {partner.description_html && (
        <Card>
          <CardContent className="p-6">
            <div
              className="partner-content"
              dangerouslySetInnerHTML={{ __html: sanitize(partner.description_html) }}
            />
          </CardContent>
        </Card>
      )}

      {(user || partner.member_offer_html) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-primary" />
              HESS Member Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!user ? (
              <SignInPrompt what="member-only offers from this partner" />
            ) : partner.member_offer_html ? (
              <div
                className="partner-content"
                dangerouslySetInnerHTML={{ __html: sanitize(partner.member_offer_html) }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No member offers have been posted for this partner yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Partner Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user ? (
              <SignInPrompt what="this partner's contact details" />
            ) : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts listed yet.</p>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="rounded-md border border-border p-4">
                  <p className="font-medium text-foreground">{contact.name}</p>
                  {contact.title && <p className="text-sm text-muted-foreground">{contact.title}</p>}
                  <div className="mt-2 space-y-1 text-sm">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Documents &amp; Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!user ? (
              <SignInPrompt what="downloadable partner documents" />
            ) : files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents have been posted yet.</p>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{file.title}</p>
                    {file.description && (
                      <p className="text-sm text-muted-foreground">{file.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.file_name} {formatSize(file.size_bytes) && `· ${formatSize(file.size_bytes)}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloading === file.id}
                    onClick={() => handleDownload(file.id, file.file_path)}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    {downloading === file.id ? 'Preparing...' : 'Download'}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            HESS Member Institution References
          </CardTitle>
        </CardHeader>
          <CardContent>
            {!user ? (
              <SignInPrompt what="member institution references for this partner" />
            ) : !referencesText ? (
              <p className="text-sm text-muted-foreground">
                No HESS member institution references have been listed for this partner yet.
              </p>
            ) : (
              <ul
                className={`columns-2 lg:columns-3 gap-6 text-sm text-foreground ${
                  referenceLines.length < 2 ? 'columns-1' : ''
                }`}
              >
                {referenceLines.map((line, index) => (
                  <li
                    key={index}
                    className="break-inside-avoid mb-2 pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/60"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
      </Card>
    </div>
  );
}
