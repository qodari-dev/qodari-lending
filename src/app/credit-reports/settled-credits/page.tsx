import { PageLayout } from '@/components/sidebar/page-layout';
import { SettledCreditsReport } from './components/settled-credits-report';

export default function SettledCreditsReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Creditos Saldados' },
      ]}
      permissionKey="report-credits:read"
    >
      <SettledCreditsReport />
    </PageLayout>
  );
}
