import { PageLayout } from '@/components/sidebar/page-layout';
import { CreditsForCollectionReport } from './components/credits-for-collection-report';

export default function PortfolioCreditsForCollectionReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Cartera' },
        { label: 'Creditos para Cobro' },
      ]}
      permissionKey="loans:read"
    >
      <CreditsForCollectionReport />
    </PageLayout>
  );
}
