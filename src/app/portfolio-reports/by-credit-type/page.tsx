import { PageLayout } from '@/components/sidebar/page-layout';
import { ByCreditTypeReport } from './components/by-credit-type-report';

export default function PortfolioByCreditTypeReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Cartera' },
        { label: 'Cartera por tipo de credito' },
      ]}
      permissionKey="loans:read"
    >
      <ByCreditTypeReport />
    </PageLayout>
  );
}
