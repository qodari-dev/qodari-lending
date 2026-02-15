import { PageLayout } from '@/components/sidebar/page-layout';
import { PaidInstallmentsReport } from './components/paid-installments-report';

export default function PaidInstallmentsReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Cuotas Pagadas' },
      ]}
      permissionKey="report-credits:read"
    >
      <PaidInstallmentsReport />
    </PageLayout>
  );
}
