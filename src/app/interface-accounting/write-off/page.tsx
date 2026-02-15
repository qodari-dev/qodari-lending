import { PageLayout } from '@/components/sidebar/page-layout';
import { InterfaceAccountingWriteOff } from './components/interface-accounting-write-off';

export default function InterfaceAccountingWriteOffPage() {
  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Movimientos' },
        { label: 'Interface Contable' },
        { label: 'Castiga' },
      ]}
      permissionKey="loans:read"
    >
      <InterfaceAccountingWriteOff />
    </PageLayout>
  );
}
