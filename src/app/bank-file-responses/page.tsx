import { PageLayout } from '@/components/sidebar/page-layout';
import { BankFileResponses } from './components/bank-file-responses';

export default function BankFileResponsesPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Cargar respuesta banco' },
      ]}
      permissionKey="loans:read"
    >
      <BankFileResponses />
    </PageLayout>
  );
}
