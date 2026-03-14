import { PageLayout } from '@/components/sidebar/page-layout';
import { RiskCenterReportHistory } from '../components/risk-center-report-history';

export default function RiskCenterHistoryPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Centrales de riesgo' },
        { label: 'Historial' },
      ]}
      permissionKey="loans:read"
    >
      <RiskCenterReportHistory />
    </PageLayout>
  );
}
