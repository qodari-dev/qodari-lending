import { PageLayout } from '@/components/sidebar/page-layout';
import { SubsidyPledgesReportForm } from '../components/subsidy-pledges-report-form';

export default function SubsidyPledgesPerformedReportPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Subsidio' },
        { label: 'Reporte de Pignoraciones realizadas' },
      ]}
      permissionKey="loans:read"
    >
      <SubsidyPledgesReportForm
        variant="PERFORMED"
        title="Reporte de Pignoraciones realizadas"
        description="Genere el Excel con los terceros a quienes se realizo el descuento de pignoracion."
      />
    </PageLayout>
  );
}
