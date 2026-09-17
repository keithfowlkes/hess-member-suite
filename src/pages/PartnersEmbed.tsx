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
        <div>
          <h1 className="text-2xl font-bold text-foreground">HESS Business Partners</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Vendor partners serving HESS Consortium institutions.
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
