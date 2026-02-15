import { PageLayout } from '@/components/sidebar/page-layout';
import { RiskCenterReportForm } from '../components/risk-center-report-form';

export default function RiskCenterDatacreditoPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Centrales de riesgo' },
        { label: 'Datacredito' },
      ]}
      permissionKey="loans:read"
    >
      <RiskCenterReportForm
        reportType="DATACREDITO"
        title="Reporte central de riesgo - Datacredito"
        description="Genere archivo plano de reporte para Datacredito."
      />
    </PageLayout>
  );
}

