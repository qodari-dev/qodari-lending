import { PageLayout } from '@/components/sidebar/page-layout';
import { ReportCreditExtract } from './components/report-credit-extract';

export default function ReportCreditExtractPage() {
  return (
    <PageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reportes' }, { label: 'Extracto de credito' }]}
      permissionKey="report-credits:read"
    >
      <ReportCreditExtract />
    </PageLayout>
  );
}
