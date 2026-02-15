import { PageLayout } from '@/components/sidebar/page-layout';
import { RiskCenterReportForm } from '../components/risk-center-report-form';

export default function RiskCenterCifinPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Reportes' },
        { label: 'Centrales de riesgo' },
        { label: 'Cifin' },
      ]}
      permissionKey="loans:read"
    >
      <RiskCenterReportForm
        reportType="CIFIN"
        title="Reporte central de riesgo - CIFIN"
        description="Genere archivo plano de reporte para CIFIN."
      />
    </PageLayout>
  );
}

