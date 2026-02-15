import { PageLayout } from '@/components/sidebar/page-layout';
import { ThirdPartyClearanceReport } from './components/third-party-clearance-report';

export default function ThirdPartyClearanceReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Paz y Salvo de Tercero' },
      ]}
      permissionKey="report-credits:read"
    >
      <ThirdPartyClearanceReport />
    </PageLayout>
  );
}
