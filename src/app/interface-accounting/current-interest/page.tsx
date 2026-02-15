import { PageLayout } from '@/components/sidebar/page-layout';
import { InterfaceAccountingCurrentInterest } from './components/interface-accounting-current-interest';

export default function InterfaceAccountingCurrentInterestPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Interface Contable' },
        { label: 'Interes Corriente' },
      ]}
      permissionKey="loans:read"
    >
      <InterfaceAccountingCurrentInterest />
    </PageLayout>
  );
}
