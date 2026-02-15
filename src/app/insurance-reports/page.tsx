import { PageLayout } from '@/components/sidebar/page-layout';
import { InsuranceReport } from './components/insurance-report';

export default function InsuranceReportsPage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reportes' }, { label: 'Aseguradoras' }]}
      permissionKey="loans:read"
    >
      <InsuranceReport />
    </PageLayout>
  );
}

