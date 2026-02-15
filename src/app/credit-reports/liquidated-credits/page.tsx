import { PageLayout } from '@/components/sidebar/page-layout';
import { LiquidatedCreditsReport } from './components/liquidated-credits-report';

export default function LiquidatedCreditsReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Creditos Liquidados' },
      ]}
      permissionKey="report-credits:read"
    >
      <LiquidatedCreditsReport />
    </PageLayout>
  );
}
