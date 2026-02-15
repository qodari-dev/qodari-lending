import { PageLayout } from '@/components/sidebar/page-layout';
import { MinutesReport } from './components/minutes-report';

export default function MinutesReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Acta' },
      ]}
      permissionKey="report-credits:read"
    >
      <MinutesReport />
    </PageLayout>
  );
}
