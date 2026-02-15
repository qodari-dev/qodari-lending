import { PageLayout } from '@/components/sidebar/page-layout';
import { CreditClearanceReport } from './components/credit-clearance-report';

export default function CreditClearanceReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Paz y Salvo de un Credito' },
      ]}
      permissionKey="report-credits:read"
    >
      <CreditClearanceReport />
    </PageLayout>
  );
}
