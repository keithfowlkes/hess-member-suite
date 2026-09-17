import { PartnersShell } from '@/components/partners/PartnersShell';
import { PartnerDirectory } from '@/components/partners/PartnerDirectory';

export default function BusinessPartners() {
  return (
    <PartnersShell>
      <div className="space-y-8">
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground">HESS / Coalition Business Partners</h1>
          <p className="text-muted-foreground mt-2">
            Vendor partners serving HESS Consortium and Coalition institutions and associations. Sign in with your member account to see
            partner contacts, documents and member-only offers.
          </p>
        </div>
        <PartnerDirectory />
      </div>
    </PartnersShell>
  );
}
