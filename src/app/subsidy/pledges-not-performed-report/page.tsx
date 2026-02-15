import { PageLayout } from '@/components/sidebar/page-layout';
import { SubsidyPledgesReportForm } from '../components/subsidy-pledges-report-form';

export default function SubsidyPledgesNotPerformedReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Subsidio' },
        { label: 'Reporte Pignorados no realizadas' },
      ]}
      permissionKey="loans:read"
    >
      <SubsidyPledgesReportForm
        variant="NOT_PERFORMED"
        title="Reporte Pignorados no realizadas"
        description="Genere el Excel con terceros a quienes no se desconto, pero se debio descontar."
      />
    </PageLayout>
  );
}
