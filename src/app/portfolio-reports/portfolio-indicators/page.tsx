import { PageLayout } from '@/components/sidebar/page-layout';
import { PortfolioIndicatorsReport } from './components/portfolio-indicators-report';

export default function PortfolioIndicatorsReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Cartera' },
        { label: 'Indicadores de Cartera' },
      ]}
      permissionKey="loans:read"
    >
      <PortfolioIndicatorsReport />
    </PageLayout>
  );
}
