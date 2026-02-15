import { PageLayout } from '@/components/sidebar/page-layout';
import { CollectionLetterForm } from '../components/collection-letter-form';

export default function CollectionAdministrativeLetterPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Oficios de cobro' },
        { label: 'Cobro administrativo' },
      ]}
      permissionKey="loans:read"
    >
      <CollectionLetterForm
        title="Oficio de cobro administrativo"
        description="Genere carta de cobro administrativo por numero de credito."
        endpoint="/api/v1/collection-letters/administrative/pdf"
        filenamePrefix="cobro-administrativo"
      />
    </PageLayout>
  );
}
