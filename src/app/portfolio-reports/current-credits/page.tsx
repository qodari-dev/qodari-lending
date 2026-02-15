import { PageLayout } from '@/components/sidebar/page-layout';
import { CurrentCreditsReport } from './components/current-credits-report';

export default function PortfolioCurrentCreditsReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Cartera' },
        { label: 'Cartera de Creditos Actual' },
      ]}
      permissionKey="loans:read"
    >
      <CurrentCreditsReport />
    </PageLayout>
  );
}
