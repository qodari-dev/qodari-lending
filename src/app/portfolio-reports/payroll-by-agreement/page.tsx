import { PageLayout } from '@/components/sidebar/page-layout';
import { PayrollByAgreementReport } from './components/payroll-by-agreement-report';

export default function PortfolioPayrollByAgreementReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Cartera' },
        { label: 'Cartera de libranza por Convenio' },
      ]}
      permissionKey="loans:read"
    >
      <PayrollByAgreementReport />
    </PageLayout>
  );
}
