import { PageLayout } from '@/components/sidebar/page-layout';
import { LiquidatedNotDisbursedCreditsReport } from './components/liquidated-not-disbursed-credits-report';

export default function LiquidatedNotDisbursedCreditsReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Creditos liquidados no desembolsados' },
      ]}
      permissionKey="report-credits:read"
    >
      <LiquidatedNotDisbursedCreditsReport />
    </PageLayout>
  );
}
