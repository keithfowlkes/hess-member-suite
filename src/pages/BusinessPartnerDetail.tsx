import { useParams } from 'react-router-dom';
import { PartnersShell } from '@/components/partners/PartnersShell';
import { PartnerMicrosite } from '@/components/partners/PartnerMicrosite';

export default function BusinessPartnerDetail() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <PartnersShell>
      <PartnerMicrosite slug={slug ?? ''} />
    </PartnersShell>
  );
}
