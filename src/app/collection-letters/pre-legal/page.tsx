import { PageLayout } from '@/components/sidebar/page-layout';
import { CollectionLetterForm } from '../components/collection-letter-form';

export default function CollectionPreLegalLetterPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Oficios de cobro' },
        { label: 'Cobro prejuridico' },
      ]}
      permissionKey="loans:read"
    >
      <CollectionLetterForm
        title="Oficio de cobro prejuridico"
        description="Genere carta de cobro prejuridico por numero de credito."
        endpoint="/api/v1/collection-letters/pre-legal/pdf"
        filenamePrefix="cobro-prejuridico"
      />
    </PageLayout>
  );
}
