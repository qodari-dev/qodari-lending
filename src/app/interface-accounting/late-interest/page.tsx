import { PageLayout } from '@/components/sidebar/page-layout';
import { InterfaceAccountingLateInterest } from './components/interface-accounting-late-interest';

export default function InterfaceAccountingLateInterestPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Interface Contable' },
        { label: 'Interes Mora' },
      ]}
      permissionKey="loans:read"
    >
      <InterfaceAccountingLateInterest />
    </PageLayout>
  );
}
