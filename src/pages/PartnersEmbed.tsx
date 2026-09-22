import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PartnerDirectory } from '@/components/partners/PartnerDirectory';
import { PartnerMicrosite } from '@/components/partners/PartnerMicrosite';

const BASE = '/embed/partners';

/**
 * Chrome-free public views of the Business Partners area, intended to be
 * embedded in other sites via <iframe>. No sidebar, header or footer.
 */
export function PartnersEmbedDirectory() {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-foreground">HESS / Coalition Business Partners</h1>
          <p className="text-muted-foreground mt-2 text-sm font-semibold">
            Vendor partners serving HESS Consortium and Coalition institutions and associations. Sign in with your member portal account to see
            HESS / Coalition partner pricing, contacts, documents and member-only offers.
          </p>
        </div>
        <PartnerDirectory basePath={BASE} />
      </div>
    </div>
  );
}

export function PartnersEmbedDetail() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <PartnerMicrosite slug={slug ?? ''} basePath={BASE} />
      </div>
    </div>
  );
}
