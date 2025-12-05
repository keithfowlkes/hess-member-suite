import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search,
  ExternalLink,
  Linkedin,
  Building2,
  User,
  Briefcase
} from 'lucide-react';

interface StructuredVerification {
  verificationStatus: string;
  confidence: string;
  foundTitle: string;
  foundDepartment: string;
  summary: string;
  linkedinUrl: string | null;
  institutionalUrl: string | null;
  notes: string | null;
  rawResponse: string;
}

interface AIVerificationResultProps {
  result: string;
  structured?: StructuredVerification | null;
  searchedFor?: {
    name: string;
    title: string | null;
    organization: string;
  };
}

export function AIVerificationResult({ result, structured, searchedFor }: AIVerificationResultProps) {
  // If we have structured data, use it for a better display
  if (structured) {
    const getStatusBadge = () => {
      const status = structured.verificationStatus.toUpperCase();
      if (status === 'VERIFIED') {
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      }
      if (status === 'LIKELY') {
        return <Badge className="bg-blue-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Likely Match</Badge>;
      }
      if (status === 'UNVERIFIED') {
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unverified</Badge>;
      }
      if (status === 'NOT_FOUND') {
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Found</Badge>;
      }
      return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    };

    const getConfidenceBadge = () => {
      const confidence = structured.confidence.toUpperCase();
      if (confidence === 'HIGH') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">High Confidence</Badge>;
      }
      if (confidence === 'MEDIUM') {
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Medium Confidence</Badge>;
      }
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Low Confidence</Badge>;
    };

    return (
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800 dark:text-blue-200">AI Contact Verification</h4>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {getConfidenceBadge()}
            </div>
          </div>

          {/* Searched For */}
          {searchedFor && (
            <div className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 rounded px-2 py-1">
              Searched for: <span className="font-medium">{searchedFor.name}</span>
              {searchedFor.title && <span> ({searchedFor.title})</span>}
              <span> at </span>
              <span className="font-medium">{searchedFor.organization}</span>
            </div>
          )}

          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Found Title */}
            {structured.foundTitle && structured.foundTitle !== 'Not found' && (
              <div className="flex items-start gap-2 bg-white/60 dark:bg-black/20 rounded-lg p-3">
                <Briefcase className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Found Title</div>
                  <div className="text-sm font-medium">{structured.foundTitle}</div>
                </div>
              </div>
            )}

            {/* Found Department */}
            {structured.foundDepartment && structured.foundDepartment !== 'Not found' && (
              <div className="flex items-start gap-2 bg-white/60 dark:bg-black/20 rounded-lg p-3">
                <Building2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Department</div>
                  <div className="text-sm font-medium">{structured.foundDepartment}</div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {structured.summary && structured.summary !== 'No summary available' && (
            <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
              <div className="text-xs text-muted-foreground font-medium mb-1">Summary</div>
              <div className="text-sm">{structured.summary}</div>
            </div>
          )}

          {/* Source Links */}
          {(structured.linkedinUrl || structured.institutionalUrl) && (
            <div className="flex flex-wrap gap-2">
              {structured.linkedinUrl && (
                <a 
                  href={structured.linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                >
                  <Linkedin className="h-3 w-3" />
                  LinkedIn Profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {structured.institutionalUrl && (
                <a 
                  href={structured.institutionalUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
                >
                  <Building2 className="h-3 w-3" />
                  Institution Page
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Notes/Discrepancies */}
          {structured.notes && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                <AlertCircle className="h-3 w-3" />
                Notes
              </div>
              <div className="text-sm text-amber-800 dark:text-amber-200">{structured.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback to parsing the raw result (legacy format)
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          <Search className="h-4 w-4" />
          AI Verification Result
        </h4>
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap prose prose-sm max-w-none">
          {result.split('\n').map((line, index) => {
            // Handle new structured format
            if (line.startsWith('VERIFICATION_STATUS:')) {
              const status = line.replace('VERIFICATION_STATUS:', '').trim().toUpperCase();
              return (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">Status:</span>
                  {status === 'VERIFIED' ? (
                    <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                  ) : status === 'LIKELY' ? (
                    <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Likely</Badge>
                  ) : status === 'NOT_FOUND' ? (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Found</Badge>
                  ) : (
                    <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>
                  )}
                </div>
              );
            }
            // Handle legacy format
            if (line.startsWith('**Verification Status:**')) {
              const status = line.replace('**Verification Status:**', '').trim().toLowerCase();
              return (
                <div key={index} className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">Verification Status:</span>
                  {status.includes('yes') ? (
                    <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                  ) : status.includes('no') ? (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Verified</Badge>
                  ) : (
                    <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unable to Verify</Badge>
                  )}
                </div>
              );
            }
            if (line.startsWith('**')) {
              const parts = line.split(':**');
              const label = parts[0].replace(/\*\*/g, '');
              const value = parts.slice(1).join(':**').trim();
              return (
                <div key={index} className="mb-1">
                  <span className="font-semibold">{label}:</span> {value}
                </div>
              );
            }
            // Handle new format labels
            if (line.match(/^[A-Z_]+:/)) {
              const [label, ...valueParts] = line.split(':');
              const value = valueParts.join(':').trim();
              if (value && value !== 'Not found') {
                const formattedLabel = label.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={index} className="mb-1">
                    <span className="font-semibold">{formattedLabel}:</span> {value}
                  </div>
                );
              }
              return null;
            }
            return line ? <p key={index} className="mb-1">{line}</p> : null;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
