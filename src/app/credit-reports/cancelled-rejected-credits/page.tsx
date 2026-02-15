import { PageLayout } from '@/components/sidebar/page-layout';
import { CancelledRejectedCreditsReport } from './components/cancelled-rejected-credits-report';

export default function CancelledRejectedCreditsReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Creditos Anulados o rechazados' },
      ]}
      permissionKey="report-credits:read"
    >
      <CancelledRejectedCreditsReport />
    </PageLayout>
  );
}
