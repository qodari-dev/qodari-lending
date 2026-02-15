import { PageLayout } from '@/components/sidebar/page-layout';
import { InterfaceAccountingProvision } from './components/interface-accounting-provision';

export default function InterfaceAccountingProvisionPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Interface Contable' },
        { label: 'Provicion' },
      ]}
      permissionKey="loans:read"
    >
      <InterfaceAccountingProvision />
    </PageLayout>
  );
}
