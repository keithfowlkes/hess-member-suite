// Shared helpers for deriving and validating the institutional email domains
// that a primary contact may invite colleagues from.

export const CONSUMER_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
];

export function domainFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const parts = String(email).trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1].replace(/[>,;\s]/g, '') || null;
}

export function domainFromWebsite(website?: string | null): string | null {
  if (!website) return null;
  try {
    const raw = String(website).trim();
    if (!raw) return null;
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(withProto).hostname.toLowerCase();
    return host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function isConsumerDomain(domain?: string | null): boolean {
  if (!domain) return false;
  return CONSUMER_EMAIL_DOMAINS.includes(domain.toLowerCase());
}

/**
 * Allowed invitation domains, ordered by trust:
 * 1. primary contact's own login email domain
 * 2. organization contact email domain
 * 3. organization website domain
 * Consumer/free mail domains are never allowed.
 */
export function getAllowedInviteDomains(params: {
  primaryContactEmail?: string | null;
  organizationEmail?: string | null;
  organizationWebsite?: string | null;
}): string[] {
  const candidates = [
    domainFromEmail(params.primaryContactEmail),
    domainFromEmail(params.organizationEmail),
    domainFromWebsite(params.organizationWebsite),
  ];

  const allowed: string[] = [];
  for (const domain of candidates) {
    if (!domain) continue;
    if (isConsumerDomain(domain)) continue;
    if (!allowed.includes(domain)) allowed.push(domain);
  }
  return allowed;
}

export function isEmailInAllowedDomains(email: string, allowedDomains: string[]): boolean {
  const domain = domainFromEmail(email);
  if (!domain) return false;
  return allowedDomains.includes(domain);
}
