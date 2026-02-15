import { PageLayout } from '@/components/sidebar/page-layout';
import { SuperintendenciaReport } from './components/superintendencia-report';

export default function SuperintendenciaReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Creditos' },
        { label: 'Superintendencia de sociedades' },
      ]}
      permissionKey="report-credits:read"
    >
      <SuperintendenciaReport />
    </PageLayout>
  );
}
