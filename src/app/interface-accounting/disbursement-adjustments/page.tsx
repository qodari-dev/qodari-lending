import { PageLayout } from '@/components/sidebar/page-layout';
import { InterfaceAccountingDisbursementAdjustments } from './components/interface-accounting-disbursement-adjustments';

export default function InterfaceAccountingDisbursementAdjustmentsPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Interface Contable' },
        { label: 'Novedades desembolso' },
      ]}
      permissionKey="loans:read"
    >
      <InterfaceAccountingDisbursementAdjustments />
    </PageLayout>
  );
}
