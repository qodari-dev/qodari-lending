import { PageLayout } from '@/components/sidebar/page-layout';
import { InterfaceAccountingPayments } from './components/interface-accounting-payments';

export default function InterfaceAccountingPaymentsPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Interface Contable' },
        { label: 'Abonos' },
      ]}
      permissionKey="loans:read"
    >
      <InterfaceAccountingPayments />
    </PageLayout>
  );
}
