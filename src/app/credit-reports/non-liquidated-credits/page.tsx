import { PageLayout } from '@/components/sidebar/page-layout';
import { NonLiquidatedCreditsReport } from './components/non-liquidated-credits-report';

export default function NonLiquidatedCreditsReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Creditos No liquidados' },
      ]}
      permissionKey="report-credits:read"
    >
      <NonLiquidatedCreditsReport />
    </PageLayout>
  );
}
