import { PageLayout } from '@/components/sidebar/page-layout';
import { HistoricalPeriodReport } from './components/historical-period-report';

export default function PortfolioHistoricalPeriodReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Cartera' },
        { label: 'Historico de Cartera Por Periodo' },
      ]}
      permissionKey="loans:read"
    >
      <HistoricalPeriodReport />
    </PageLayout>
  );
}
